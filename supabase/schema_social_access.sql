-- ============================================================================
-- Client social-account logins, so the team can post for them. Run after
-- schema_security_audit.sql (uses my_org_id(), is_staff(), is_admin()).
--
-- The password (and any 2FA notes) is encrypted by the social-access Edge
-- Function before it is stored: `secret` holds AES-256-GCM ciphertext whose
-- key exists only in that function's SOCIAL_VAULT_KEY secret. On top of that:
--   * browsers can SELECT every column except `secret` (column grants), so
--     not even staff can pull ciphertext through the API;
--   * nobody can insert/update/delete from the browser; every write goes
--     through the function (which checks who is asking);
--   * a team member must re-enter their own password to unlock the vault
--     (10 minutes; 5 wrong tries in 15 minutes locks them out) and can reveal
--     at most 30 passwords an hour (social_vault_unlocks + the event log);
--   * every unlock, reveal, save and removal is written to
--     social_login_events with IP and device, which only admins can read.
-- ============================================================================

create table if not exists public.social_logins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'linkedin', 'x', 'facebook', 'youtube', 'blog', 'other')),
  label text check (char_length(label) <= 80),
  username text not null check (char_length(username) between 1 and 200),
  secret text not null,
  status text not null default 'submitted' check (status in ('submitted', 'working', 'not_working')),
  status_note text check (char_length(status_note) <= 300),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_revealed_at timestamptz,
  last_revealed_by uuid references public.profiles(id) on delete set null
);
create index if not exists idx_social_logins_org on public.social_logins(org_id);

alter table public.social_logins enable row level security;
revoke all on public.social_logins from anon, authenticated;
grant select (id, org_id, platform, label, username, status, status_note, created_by, created_at, updated_at, last_revealed_at, last_revealed_by)
  on public.social_logins to authenticated;

drop policy if exists "clients read own org social logins" on public.social_logins;
create policy "clients read own org social logins" on public.social_logins
  for select to authenticated using (org_id = public.my_org_id());
drop policy if exists "staff read all social logins" on public.social_logins;
create policy "staff read all social logins" on public.social_logins
  for select to authenticated using (public.is_staff());

-- Who did what, from where. org_id is empty for vault unlocks (they're about
-- a team member, not a client). Read by admins only; written by the function.
create table if not exists public.social_login_events (
  id bigint generated always as identity primary key,
  login_id uuid references public.social_logins(id) on delete set null,
  org_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('saved', 'updated', 'removed', 'revealed', 'status', 'unlocked', 'unlock_failed', 'blocked')),
  detail text check (char_length(detail) <= 200),
  ip text check (char_length(ip) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists idx_social_login_events_actor on public.social_login_events(actor_id, action, created_at desc);
create index if not exists idx_social_login_events_org on public.social_login_events(org_id, created_at desc);

alter table public.social_login_events enable row level security;
revoke all on public.social_login_events from anon, authenticated;
grant select on public.social_login_events to authenticated;
drop policy if exists "admins read social login events" on public.social_login_events;
create policy "admins read social login events" on public.social_login_events
  for select to authenticated using (public.is_admin());

-- Step-up unlock: a team member re-entered their password at this time.
-- Service role only (no grants): the browser can neither read nor fake it.
create table if not exists public.social_vault_unlocks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  unlocked_until timestamptz not null
);
alter table public.social_vault_unlocks enable row level security;
revoke all on public.social_vault_unlocks from anon, authenticated;
