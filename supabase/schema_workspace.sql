-- ============================================================================
-- Workspace: pipeline/calendar fields on requests, a per-client brand kit,
-- and staff-entered monthly results. Run after schema_client_review.sql.
-- ============================================================================

-- ---- requests: format, platforms, publish date -----------------------------
alter table public.requests
  add column if not exists format text
    check (format in ('carousel', 'reel', 'graphic', 'ugc_video', 'seo_article', 'other')),
  add column if not exists platforms text[] not null default '{}'
    check (platforms <@ array['instagram', 'tiktok', 'linkedin', 'x', 'facebook', 'youtube', 'blog']::text[]),
  add column if not exists publish_at timestamptz;

create index if not exists idx_requests_publish_at on public.requests(publish_at);

-- Same rules as schema_client_review.sql, plus publish_at is staff-only:
-- the team owns the publishing schedule, clients see it.
create or replace function public.protect_request_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() and auth.role() <> 'service_role' then
    if new.stage is distinct from old.stage
      and not (old.stage = 'review' and new.stage in ('delivered', 'in_progress')) then
      raise exception 'not permitted to change this field';
    end if;
    if new.assigned_to is distinct from old.assigned_to
      or new.due_date is distinct from old.due_date
      or new.publish_at is distinct from old.publish_at
      or new.org_id is distinct from old.org_id
      or new.created_by is distinct from old.created_by then
      raise exception 'not permitted to change this field';
    end if;
  end if;
  return new;
end;
$$;

-- A client can't schedule their own new request either.
drop policy if exists "clients create own org requests" on public.requests;
create policy "clients create own org requests" on public.requests
  for insert to authenticated with check (
    org_id = public.my_org_id()
    and stage = 'requested'
    and assigned_to is null
    and publish_at is null
    and created_by = auth.uid()
  );

-- ---- brand_kits: one per client org -----------------------------------------
create table if not exists public.brand_kits (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  tagline text check (char_length(tagline) <= 200),
  colors jsonb not null default '[]'
    check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) <= 12),
  voice text check (char_length(voice) <= 2000),
  audience text check (char_length(audience) <= 2000),
  dos text[] not null default '{}' check (cardinality(dos) <= 20),
  donts text[] not null default '{}' check (cardinality(donts) <= 20),
  handles jsonb not null default '{}' check (jsonb_typeof(handles) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create or replace function public.stamp_brand_kit()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_stamp_brand_kit on public.brand_kits;
create trigger trg_stamp_brand_kit
  before insert or update on public.brand_kits
  for each row execute function public.stamp_brand_kit();

alter table public.brand_kits enable row level security;
revoke all on public.brand_kits from anon, authenticated;
grant select, insert, update on public.brand_kits to authenticated;

create policy "clients read own brand kit" on public.brand_kits
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all brand kits" on public.brand_kits
  for select to authenticated using (public.is_staff());
create policy "clients create own brand kit" on public.brand_kits
  for insert to authenticated with check (org_id = public.my_org_id());
create policy "staff create brand kits" on public.brand_kits
  for insert to authenticated with check (public.is_staff());
create policy "clients update own brand kit" on public.brand_kits
  for update to authenticated using (org_id = public.my_org_id()) with check (org_id = public.my_org_id());
create policy "staff update brand kits" on public.brand_kits
  for update to authenticated using (public.is_staff());

-- ---- performance_reports: real monthly numbers, entered by staff -----------
create table if not exists public.performance_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period_month date not null check (extract(day from period_month) = 1),
  platform text not null
    check (platform in ('instagram', 'tiktok', 'linkedin', 'x', 'facebook', 'youtube', 'blog')),
  followers integer check (followers >= 0),
  reach integer check (reach >= 0),
  engagement_rate numeric(5, 2) check (engagement_rate between 0 and 100),
  posts_published integer check (posts_published >= 0),
  notes text check (char_length(notes) <= 1000),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, period_month, platform)
);

create index if not exists idx_performance_reports_org on public.performance_reports(org_id, period_month);

drop trigger if exists trg_performance_reports_updated_at on public.performance_reports;
create trigger trg_performance_reports_updated_at
  before update on public.performance_reports
  for each row execute function public.set_updated_at();

alter table public.performance_reports enable row level security;
revoke all on public.performance_reports from anon, authenticated;
grant select, insert, update, delete on public.performance_reports to authenticated;

create policy "clients read own results" on public.performance_reports
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all results" on public.performance_reports
  for select to authenticated using (public.is_staff());
create policy "staff write results" on public.performance_reports
  for insert to authenticated with check (public.is_staff());
create policy "staff update results" on public.performance_reports
  for update to authenticated using (public.is_staff());
create policy "staff delete results" on public.performance_reports
  for delete to authenticated using (public.is_staff());
