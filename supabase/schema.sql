-- ============================================================================
-- Socialio Dashboard — Database Schema
-- ============================================================================
-- Run manually in the Supabase SQL Editor once a real project exists (no
-- Supabase CLI in this repo — matches the existing convention already used
-- for contact_submissions in plans/01-hero-cleanup-and-supabase-integration.md).
--
-- Design rationale lives in the approved plan (client portal + internal ops +
-- admin, sharing one data model, gated by a one-time proposal approval before
-- work enters the production Kanban).
--
-- Order matters: extensions -> tables -> indexes -> helper functions ->
-- triggers -> RLS policies -> storage. Helper functions must exist before any
-- policy or trigger that references them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per authenticated user, for BOTH sides: any number of people at a
-- client's business can share one org_id, and any number of Socialio staff
-- can each have their own internal/admin login. Every FK below that points
-- at profiles.id is what makes actions individually traceable.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  role text not null default 'client' check (role in ('client', 'internal', 'admin')),
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The one-time approval gate. pending -> approved creates `requests` rows
-- (see trg_create_requests_from_proposal below); pending -> rejected is
-- terminal for this proposal (staff would create a new one to re-offer).
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  total_price numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  service_id text not null, -- matches an id in src/data/services.ts
  tier_label text not null, -- matches a sliderSteps[].label from that service
  price numeric(10,2) not null
);

-- The production Kanban card. stage is a plain CHECK, not an enum or a
-- configurable pipeline_stages table — nobody's asked for custom per-client
-- pipelines, and this matches the 4-stage flow already promised in the
-- marketing copy. Revisit only if a real second-pipeline need shows up.
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  proposal_item_id uuid references public.proposal_items(id) on delete set null,
  title text not null,
  description text,
  service_type text,
  stage text not null default 'requested' check (stage in ('requested', 'in_progress', 'review', 'delivered')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_path text not null, -- Storage path: {org_id}/{request_id}/{filename}
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- visibility lets staff leave internal notes clients never see, without a
-- second table.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  visibility text not null default 'client' check (visibility in ('client', 'internal')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes — every FK a query will actually filter/join on
-- ----------------------------------------------------------------------------
create index idx_profiles_org_id on public.profiles(org_id);
create index idx_proposals_org_id on public.proposals(org_id);
create index idx_proposal_items_proposal_id on public.proposal_items(proposal_id);
create index idx_requests_org_id on public.requests(org_id);
create index idx_requests_assigned_to on public.requests(assigned_to);
create index idx_deliverables_request_id on public.deliverables(request_id);
create index idx_comments_request_id on public.comments(request_id);

-- ============================================================================
-- Helper functions (SECURITY DEFINER, search_path pinned)
-- ============================================================================
-- Called from every RLS policy instead of subquerying `profiles` directly —
-- a policy ON profiles that subqueries profiles re-triggers its own RLS and
-- recurses infinitely. search_path is pinned because an unpinned search_path
-- on a SECURITY DEFINER function is itself a privilege-escalation vector (a
-- malicious search_path could shadow `profiles` with another table).

create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('internal', 'admin')
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

-- ---- Auto-create a profile row when a new auth user appears -----------------
-- The invite-client Edge Function passes role/org_id/full_name as user
-- metadata to supabase.auth.admin.inviteUserByEmail(); this trigger reads
-- that metadata so the profile is correct the moment auth.users gets the row.
-- SECURITY DEFINER means this insert bypasses the profiles RLS policies below
-- (intentional — there is no authenticated caller yet at signup time).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, org_id, role, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'org_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Protect privileged columns from client-initiated changes --------------
-- RLS policies decide WHICH ROWS a role can touch; they cannot see "which
-- columns changed" (USING/WITH CHECK each evaluate one row version at a
-- time). These triggers run underneath whatever RLS policy let the UPDATE
-- through and reject specific column changes when the caller isn't staff.
-- Named trg_1_* so they run before any trg_2_* side-effect trigger on the
-- same table — Postgres fires same-timing triggers in name order, and even
-- though a later exception would roll back the whole transaction either way,
-- making validation-before-side-effects explicit is worth the two extra
-- characters.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- is_admin(), NOT is_staff() — an internal (non-admin) user updating their
  -- OWN row via "users update own profile" must not be able to self-promote
  -- to admin. Only admin may change role/org_id/is_active, on any row.
  if not public.is_admin() then
    if new.role is distinct from old.role
      or new.org_id is distinct from old.org_id
      or new.is_active is distinct from old.is_active then
      raise exception 'not permitted to change role, org_id, or is_active';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_1_protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.protect_proposal_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    -- clients may only flip status, and only pending -> approved/rejected
    if new.org_id is distinct from old.org_id
      or new.created_by is distinct from old.created_by
      or new.total_price is distinct from old.total_price then
      raise exception 'not permitted to change this field';
    end if;
    if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
      raise exception 'invalid proposal status transition';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_1_protect_proposal_columns
  before update on public.proposals
  for each row execute function public.protect_proposal_columns();

create or replace function public.protect_request_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    -- clients cannot move the pipeline themselves (stage/assignee/due date) —
    -- that's staff's job. MVP has no client-facing "approve delivery" column
    -- yet beyond the stage itself; this trigger already blocks stage changes,
    -- so add a dedicated column here when that interaction is built.
    if new.stage is distinct from old.stage
      or new.assigned_to is distinct from old.assigned_to
      or new.due_date is distinct from old.due_date
      or new.org_id is distinct from old.org_id
      or new.created_by is distinct from old.created_by then
      raise exception 'not permitted to change this field';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_1_protect_request_columns
  before update on public.requests
  for each row execute function public.protect_request_columns();

-- ---- Approving a proposal creates its requests ------------------------------
create or replace function public.create_requests_from_proposal()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    insert into public.requests (org_id, proposal_item_id, title, service_type, created_by)
    select new.org_id, pi.id, pi.tier_label, pi.service_id, new.created_by
    from public.proposal_items pi
    where pi.proposal_id = new.id;
    new.responded_at = now();
  elsif new.status = 'rejected' and old.status = 'pending' then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_2_create_requests_from_proposal
  before update on public.proposals
  for each row execute function public.create_requests_from_proposal();

-- ---- Keep updated_at current on requests ------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_2_requests_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;
alter table public.requests enable row level security;
alter table public.deliverables enable row level security;
alter table public.comments enable row level security;

-- Defense in depth: grants decide whether an operation is even on the table;
-- policies decide which rows. Revoke the broad default grants, grant back
-- only what's needed, same convention as contact_submissions in the earlier
-- paused plan.
revoke all on public.organizations from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.proposals from anon, authenticated;
revoke all on public.proposal_items from anon, authenticated;
revoke all on public.requests from anon, authenticated;
revoke all on public.deliverables from anon, authenticated;
revoke all on public.comments from anon, authenticated;

grant select, insert, update on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.proposals to authenticated;
grant select, insert, update, delete on public.proposal_items to authenticated;
grant select, insert, update on public.requests to authenticated;
grant select, insert on public.deliverables to authenticated;
grant select, insert on public.comments to authenticated;
-- No delete grants on proposals/requests/deliverables/comments/profiles —
-- these are the traceable business record; nothing here should be hard-
-- deletable. profiles are deactivated (is_active=false), not removed.

-- ---- organizations -----------------------------------------------------
create policy "clients read own org" on public.organizations
  for select to authenticated using (id = public.my_org_id());

create policy "staff read all orgs" on public.organizations
  for select to authenticated using (public.is_staff());

create policy "admin inserts orgs" on public.organizations
  for insert to authenticated with check (public.is_admin());

create policy "admin updates orgs" on public.organizations
  for update to authenticated using (public.is_admin());

-- ---- profiles -----------------------------------------------------------
create policy "users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "users read staff profiles" on public.profiles
  for select to authenticated using (role in ('internal', 'admin'));

create policy "staff read all profiles" on public.profiles
  for select to authenticated using (public.is_staff());

create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());
  -- privileged-column protection enforced by trg_1_protect_profile_columns
  -- (which checks is_admin(), not is_staff() — an internal user editing
  -- their own row here must not be able to touch role/org_id/is_active)

create policy "admin updates any profile" on public.profiles
  for update to authenticated using (public.is_admin());
  -- without this, UsersAdmin (deactivating staff, fixing a client's org_id)
  -- would have nothing to run against — "own row only" above isn't enough

create policy "admin inserts profiles" on public.profiles
  for insert to authenticated with check (public.is_admin());
  -- the normal signup path is trg_handle_new_user (security definer, bypasses
  -- RLS entirely); this policy only covers a direct admin-initiated insert

-- ---- proposals ------------------------------------------------------------
create policy "clients read own org proposals" on public.proposals
  for select to authenticated using (org_id = public.my_org_id());

create policy "staff read all proposals" on public.proposals
  for select to authenticated using (public.is_staff());

create policy "staff create proposals" on public.proposals
  for insert to authenticated with check (public.is_staff());

create policy "clients update own org proposals" on public.proposals
  for update to authenticated using (org_id = public.my_org_id());
  -- transition/column protection enforced by trg_1_protect_proposal_columns

create policy "staff update all proposals" on public.proposals
  for update to authenticated using (public.is_staff());

-- ---- proposal_items ---------------------------------------------------------
create policy "clients read own org proposal items" on public.proposal_items
  for select to authenticated using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_items.proposal_id and p.org_id = public.my_org_id()
    )
  );

create policy "staff read all proposal items" on public.proposal_items
  for select to authenticated using (public.is_staff());

create policy "staff write proposal items" on public.proposal_items
  for insert to authenticated with check (public.is_staff());

create policy "staff update proposal items" on public.proposal_items
  for update to authenticated using (public.is_staff());

create policy "staff delete proposal items" on public.proposal_items
  for delete to authenticated using (public.is_staff());

-- ---- requests -----------------------------------------------------------
create policy "clients read own org requests" on public.requests
  for select to authenticated using (org_id = public.my_org_id());

create policy "staff read all requests" on public.requests
  for select to authenticated using (public.is_staff());

create policy "clients create own org requests" on public.requests
  for insert to authenticated with check (
    org_id = public.my_org_id()
    and stage = 'requested'
    and assigned_to is null
    and created_by = auth.uid()
  );

create policy "staff create requests" on public.requests
  for insert to authenticated with check (public.is_staff());

create policy "clients update own org requests" on public.requests
  for update to authenticated using (org_id = public.my_org_id());
  -- column protection enforced by trg_1_protect_request_columns

create policy "staff update all requests" on public.requests
  for update to authenticated using (public.is_staff());

-- ---- deliverables ---------------------------------------------------------
create policy "clients read own org deliverables" on public.deliverables
  for select to authenticated using (
    exists (
      select 1 from public.requests r
      where r.id = deliverables.request_id and r.org_id = public.my_org_id()
    )
  );

create policy "staff read all deliverables" on public.deliverables
  for select to authenticated using (public.is_staff());

create policy "staff upload deliverables" on public.deliverables
  for insert to authenticated with check (public.is_staff());

-- ---- comments -----------------------------------------------------------
create policy "clients read own org client-visible comments" on public.comments
  for select to authenticated using (
    visibility = 'client'
    and exists (
      select 1 from public.requests r
      where r.id = comments.request_id and r.org_id = public.my_org_id()
    )
  );

create policy "staff read all comments" on public.comments
  for select to authenticated using (public.is_staff());

create policy "clients create own org client comments" on public.comments
  for insert to authenticated with check (
    visibility = 'client'
    and author_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = comments.request_id and r.org_id = public.my_org_id()
    )
  );

create policy "staff create comments" on public.comments
  for insert to authenticated with check (public.is_staff() and author_id = auth.uid());

-- ============================================================================
-- Storage
-- ============================================================================
-- Table RLS above protects the `deliverables` *table row*. It does nothing if
-- the Storage bucket itself is public or unpoliced — anyone with (or
-- guessing) a file path could pull another org's file directly, bypassing
-- Postgres RLS entirely. Bucket is created private here; policies below
-- mirror the table's org-scoping. Path convention: {org_id}/{request_id}/{filename}.

insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

create policy "clients read own org deliverable files" on storage.objects
  for select to authenticated using (
    bucket_id = 'deliverables'
    and (public.is_staff() or (storage.foldername(name))[1]::uuid = public.my_org_id())
  );

create policy "staff upload deliverable files" on storage.objects
  for insert to authenticated with check (bucket_id = 'deliverables' and public.is_staff());

-- ============================================================================
-- Manual RLS verification checklist
-- ============================================================================
-- Convention: probe as real authenticated test users via supabase-js
-- (supabase.from(...).select()/.insert()/.update()), not a SQL test
-- framework — matches this repo's existing verification approach.
--
-- Automated as of 2026-09-16 in scripts/verify_rls.mjs — 21/21 checks
-- passing against the live project as of commit 11a4f7f. Re-run it after
-- any RLS/schema change. Items below marked [x] are covered by that script;
-- [ ] items are still manual-only (mostly staff-role and storage checks the
-- script doesn't touch yet).
--
-- Set up: two orgs (A, B), one client user in each, one internal user, one
-- admin user, one proposal per org, one approved (org A) to produce requests.
--
-- [x] Anon (no session): select on organizations/orders returns empty.
-- [x] Client A: select organizations returns only org A's row.
-- [x] Client A: select proposals/requests returns only org A's rows — zero
--     rows from org B, even by guessing IDs. (proposal_items/deliverables
--     not yet covered by the script — same org-scoped join-policy pattern,
--     lower risk, but not independently verified.)
-- [x] Client A: attempting update on proposals.total_price or requests.stage
--     is rejected. ([ ] requests.assigned_to and profiles.org_id/is_active
--     specifically not yet covered — same trigger as role, same code path,
--     but not independently verified.)
-- [x] Client A: insert into requests with stage='delivered' is rejected
--     (WITH CHECK forces stage='requested').
-- [x] Client A: approving their own pending proposal (status -> 'approved')
--     succeeds AND creates matching requests rows automatically.
-- [x] Client A: cannot read comments where visibility='internal'.
-- [x] Client A: cannot self-escalate profiles.role to 'admin'.
-- [ ] Client A: storage download of an org B file path is denied, even with
--     a directly-guessed/known path.
-- [ ] Internal user: can read/update across both org A and org B.
-- [ ] Internal (non-admin): creating a new organization is rejected
--     (admin-only).
-- [ ] Internal (non-admin): attempting to update their own profiles.role to
--     'admin' is rejected (self-escalation) — tested for role='client' above;
--     same is_admin() check governs 'internal' too, but not independently run.
-- [ ] Admin: can update another user's profile row — deactivate a departing
--     staff member (is_active=false), fix a client's org_id.
-- [ ] Admin: can create an organization and (via the invite-client Edge
--     Function, not raw SQL) invite a user into it. (Verified via real
--     browser E2E earlier in the project's history, and the underlying
--     profile-provisioning fix verified via scripts/verify_rls.mjs — but not
--     the full invite-through-email path since that migration to
--     app_metadata.)
