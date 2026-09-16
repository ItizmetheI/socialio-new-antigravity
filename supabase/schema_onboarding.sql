-- ============================================================================
-- Client onboarding — Phase 2 (steady-crafting-wren.md). Additive, no
-- changes to any existing table. Started ahead of Stripe availability per
-- explicit instruction not to wait — onboarding doesn't depend on payments
-- at all, only on an org existing (which today only happens via admin
-- invite; once checkout ships, the same table serves that path too).
-- ============================================================================

create table public.client_onboarding (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted', 'reviewed')),
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.onboarding_assets (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.client_onboarding(id) on delete cascade,
  file_path text not null, -- Storage path: {org_id}/onboarding/{filename}, same deliverables bucket
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_onboarding_assets_onboarding_id on public.onboarding_assets(onboarding_id);

-- ----------------------------------------------------------------------------
-- Column protection — clients own progressive saving (answers, status up
-- through 'submitted'); only staff can set status='reviewed' or touch
-- reviewed_at/reviewed_by. Same trg_1_* pattern as protect_proposal_columns.
-- ----------------------------------------------------------------------------
create or replace function public.protect_onboarding_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    if new.org_id is distinct from old.org_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by then
      raise exception 'not permitted to change this field';
    end if;
    if new.status = 'reviewed' and old.status <> 'reviewed' then
      raise exception 'only staff can mark onboarding as reviewed';
    end if;
    if old.status = 'reviewed' then
      raise exception 'onboarding already reviewed — contact your account manager for changes';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_1_protect_onboarding_columns
  before update on public.client_onboarding
  for each row execute function public.protect_onboarding_columns();

create or replace function public.set_onboarding_submitted_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_2_onboarding_submitted_at
  before update on public.client_onboarding
  for each row execute function public.set_onboarding_submitted_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.client_onboarding enable row level security;
alter table public.onboarding_assets enable row level security;

revoke all on public.client_onboarding, public.onboarding_assets from anon, authenticated;

grant select, insert, update on public.client_onboarding to authenticated;
grant select, insert on public.onboarding_assets to authenticated;

create policy "clients read own org onboarding" on public.client_onboarding
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all onboarding" on public.client_onboarding
  for select to authenticated using (public.is_staff());

create policy "clients create own org onboarding" on public.client_onboarding
  for insert to authenticated with check (org_id = public.my_org_id());
create policy "staff create onboarding" on public.client_onboarding
  for insert to authenticated with check (public.is_staff());

create policy "clients update own org onboarding" on public.client_onboarding
  for update to authenticated using (org_id = public.my_org_id());
  -- transition/column protection enforced by trg_1_protect_onboarding_columns
create policy "staff update all onboarding" on public.client_onboarding
  for update to authenticated using (public.is_staff());

create policy "clients read own org onboarding assets" on public.onboarding_assets
  for select to authenticated using (
    exists (
      select 1 from public.client_onboarding o
      where o.id = onboarding_assets.onboarding_id and o.org_id = public.my_org_id()
    )
  );
create policy "staff read all onboarding assets" on public.onboarding_assets
  for select to authenticated using (public.is_staff());

create policy "clients upload own org onboarding assets" on public.onboarding_assets
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.client_onboarding o
      where o.id = onboarding_assets.onboarding_id and o.org_id = public.my_org_id()
    )
  );
create policy "staff upload onboarding assets" on public.onboarding_assets
  for insert to authenticated with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- Storage — reuses the existing private `deliverables` bucket (schema.sql)
-- under a new {org_id}/onboarding/{filename} prefix, rather than a second
-- bucket. The bucket's existing client-read / staff-upload policies don't
-- cover client uploads at all (deliverables are staff → client, one-way);
-- onboarding needs client → staff, so this adds a narrowly-scoped insert
-- policy for exactly the onboarding/ prefix, nothing broader.
-- ----------------------------------------------------------------------------
create policy "clients upload own org onboarding files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1]::uuid = public.my_org_id()
    and (storage.foldername(name))[2] = 'onboarding'
  );

-- ============================================================================
-- Manual verification checklist — extends schema.sql's / schema_commerce.sql's.
-- ============================================================================
-- [ ] Client A: can create + progressively update their own onboarding row.
-- [ ] Client A: cannot read/update org B's onboarding row.
-- [ ] Client A: can flip status to 'submitted' (sets submitted_at); cannot
--     flip to 'reviewed'.
-- [ ] Client A: once status='reviewed', further updates are rejected.
-- [ ] Client A: can upload a file under their own org_id/onboarding/ prefix;
--     cannot upload under another org's prefix or outside onboarding/.
-- [ ] Staff: can read/update any org's onboarding, including marking reviewed.
