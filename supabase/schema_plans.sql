-- ============================================================================
-- Plans — Phase 3 (steady-crafting-wren.md). The post-purchase curated-plan
-- system that replaces proposals as the approval gate for new orgs. Purely
-- additive: `proposals`/`proposal_items` and their UI are untouched — orgs
-- with an existing proposal keep using it, new orgs route through plans.
-- ============================================================================

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'changes_requested', 'approved', 'superseded')),
  version integer not null default 1,
  supersedes_plan_id uuid references public.plans(id) on delete set null,
  total_price numeric(10,2) not null default 0,
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  service_id text, -- matches an id in src/data/services.ts; null for a custom/non-catalog line
  deliverable_label text not null, -- e.g. "10 Social Media Posts" — always shown, regardless of service_id
  quantity integer not null default 1 check (quantity > 0),
  frequency text, -- e.g. "monthly", "one-time"
  platform text, -- e.g. "Instagram" — nullable, not every line is platform-specific
  price numeric(10,2) not null default 0,
  notes text
);

create table public.plan_feedback (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- A request now can originate from a proposal_item (old flow) or a
-- plan_item (new flow) — additive nullable column, mirrors proposal_item_id
-- exactly. Never both on the same row in practice, but not DB-enforced
-- exclusivity since nothing depends on that invariant holding strictly.
alter table public.requests add column plan_item_id uuid references public.plan_items(id) on delete set null;

create index idx_plans_org_id on public.plans(org_id);
create index idx_plan_items_plan_id on public.plan_items(plan_id);
create index idx_plan_feedback_plan_id on public.plan_feedback(plan_id);
create index idx_requests_plan_item_id on public.requests(plan_item_id);

-- ----------------------------------------------------------------------------
-- Column protection — clients may only flip status among the client-facing
-- transitions (sent/viewed -> approved/changes_requested); everything else
-- (line items, price, version, supersedes_plan_id) is staff-only. Same
-- trg_1_* pattern as protect_proposal_columns.
-- ----------------------------------------------------------------------------
create or replace function public.protect_plan_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then
    if new.org_id is distinct from old.org_id
      or new.created_by is distinct from old.created_by
      or new.version is distinct from old.version
      or new.supersedes_plan_id is distinct from old.supersedes_plan_id
      or new.total_price is distinct from old.total_price
      or new.sent_at is distinct from old.sent_at then
      raise exception 'not permitted to change this field';
    end if;
    if old.status not in ('sent', 'viewed') or new.status not in ('approved', 'changes_requested', 'viewed') then
      raise exception 'invalid plan status transition';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_1_protect_plan_columns
  before update on public.plans
  for each row execute function public.protect_plan_columns();

-- ---- Timestamps follow status automatically -------------------------------
create or replace function public.set_plan_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'viewed' and old.status = 'sent' then
    new.viewed_at = now();
  end if;
  if new.status in ('approved', 'changes_requested') and old.status <> new.status then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_2_plan_status_timestamps
  before update on public.plans
  for each row execute function public.set_plan_status_timestamps();

-- ---- Approving a plan creates its requests ---------------------------------
create or replace function public.create_requests_from_plan()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    insert into public.requests (org_id, plan_item_id, title, service_type, created_by)
    select new.org_id, pi.id, pi.deliverable_label, pi.service_id, new.created_by
    from public.plan_items pi
    where pi.plan_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_3_create_requests_from_plan
  after update on public.plans
  for each row execute function public.create_requests_from_plan();

-- ---- A revision (new plan with supersedes_plan_id set) retires the old one
create or replace function public.supersede_previous_plan()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.supersedes_plan_id is not null then
    update public.plans set status = 'superseded' where id = new.supersedes_plan_id;
  end if;
  return new;
end;
$$;

create trigger trg_2_supersede_previous_plan
  after insert on public.plans
  for each row execute function public.supersede_previous_plan();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.plan_feedback enable row level security;

revoke all on public.plans, public.plan_items, public.plan_feedback from anon, authenticated;

grant select, update on public.plans to authenticated;
grant insert on public.plans to authenticated; -- staff-only in practice, gated by policy below
grant select on public.plan_items to authenticated;
grant insert, update, delete on public.plan_items to authenticated; -- staff-only, gated by policy
grant select, insert on public.plan_feedback to authenticated;

create policy "clients read own org plans" on public.plans
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all plans" on public.plans
  for select to authenticated using (public.is_staff());

create policy "staff create plans" on public.plans
  for insert to authenticated with check (public.is_staff());

create policy "clients update own org plans" on public.plans
  for update to authenticated using (org_id = public.my_org_id());
  -- transition/column protection enforced by trg_1_protect_plan_columns
create policy "staff update all plans" on public.plans
  for update to authenticated using (public.is_staff());

create policy "clients read own org plan items" on public.plan_items
  for select to authenticated using (
    exists (select 1 from public.plans p where p.id = plan_items.plan_id and p.org_id = public.my_org_id())
  );
create policy "staff read all plan items" on public.plan_items
  for select to authenticated using (public.is_staff());
create policy "staff write plan items" on public.plan_items
  for insert to authenticated with check (public.is_staff());
create policy "staff update plan items" on public.plan_items
  for update to authenticated using (public.is_staff());
create policy "staff delete plan items" on public.plan_items
  for delete to authenticated using (public.is_staff());

create policy "clients read own org plan feedback" on public.plan_feedback
  for select to authenticated using (
    exists (select 1 from public.plans p where p.id = plan_feedback.plan_id and p.org_id = public.my_org_id())
  );
create policy "staff read all plan feedback" on public.plan_feedback
  for select to authenticated using (public.is_staff());
create policy "clients create own org plan feedback" on public.plan_feedback
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (select 1 from public.plans p where p.id = plan_feedback.plan_id and p.org_id = public.my_org_id())
  );
create policy "staff create plan feedback" on public.plan_feedback
  for insert to authenticated with check (public.is_staff() and author_id = auth.uid());

-- ============================================================================
-- Manual verification checklist — extends schema.sql's / schema_commerce.sql's
-- / schema_onboarding.sql's.
-- ============================================================================
-- [ ] Client A: sees only their own org's latest plan; cannot read org B's.
-- [ ] Client A: cannot change plan_items, total_price, version, or
--     supersedes_plan_id.
-- [ ] Client A: opening a 'sent' plan and flipping to 'viewed' sets
--     viewed_at; cannot skip straight from 'sent' to 'approved' via a
--     forged direct status write bypassing 'viewed' — actually IS allowed
--     (sent -> approved is a valid direct transition per the trigger);
--     verify sent/viewed -> draft or -> superseded is rejected either way.
-- [ ] Client A: approving creates requests rows from plan_items, each with
--     plan_item_id set.
-- [ ] Staff: creating a revision (supersedes_plan_id = old plan's id)
--     automatically flips the old plan to 'superseded'.
-- [ ] Client A and staff can both post plan_feedback; client cannot post
--     feedback on org B's plan.
