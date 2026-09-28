-- ============================================================================
-- Activity feed + live updates. Run after schema_security_audit.sql.
--
-- activity_events is written ONLY by triggers (no insert/update/delete grant
-- to anyone), so the history can't be forged or edited from the browser.
-- Clients see their own org's events minus internal ones; staff see all.
-- activity_reads keeps each user's "seen up to" time for unread counts.
-- Realtime is switched on for the tables the dashboards watch; Supabase
-- Realtime applies the same RLS, so nobody receives rows they can't read.
-- ============================================================================

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in (
    'request_created', 'stage_changed', 'comment_added', 'file_delivered',
    'plan_sent', 'plan_approved', 'plan_changes_requested', 'payment_received'
  )),
  request_id uuid references public.requests(id) on delete cascade,
  summary text not null check (char_length(summary) <= 300),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_org_created on public.activity_events(org_id, created_at desc);
create index if not exists idx_activity_created on public.activity_events(created_at desc);

alter table public.activity_events enable row level security;
revoke all on public.activity_events from anon, authenticated;
grant select on public.activity_events to authenticated;

drop policy if exists "clients read own org activity" on public.activity_events;
create policy "clients read own org activity" on public.activity_events
  for select to authenticated using (org_id = public.my_org_id() and not is_internal);
drop policy if exists "staff read all activity" on public.activity_events;
create policy "staff read all activity" on public.activity_events
  for select to authenticated using (public.is_staff());

create table if not exists public.activity_reads (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.activity_reads enable row level security;
revoke all on public.activity_reads from anon, authenticated;
grant select, insert, update on public.activity_reads to authenticated;

drop policy if exists "users read own read marker" on public.activity_reads;
create policy "users read own read marker" on public.activity_reads
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "users write own read marker" on public.activity_reads;
create policy "users write own read marker" on public.activity_reads
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own read marker" on public.activity_reads;
create policy "users update own read marker" on public.activity_reads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- Writers (triggers) ------------------------------------------------------

create or replace function public.log_activity(
  p_org uuid, p_kind text, p_request uuid, p_summary text, p_internal boolean default false
)
returns void
language sql security definer set search_path = public
as $$
  insert into public.activity_events (org_id, actor_id, kind, request_id, summary, is_internal)
  values (p_org, auth.uid(), p_kind, p_request, left(p_summary, 300), p_internal);
$$;

create or replace function public.activity_on_request()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_label text;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.org_id, 'request_created', new.id, format('New request: %s', new.title));
  elsif new.stage is distinct from old.stage then
    v_label := case new.stage
      when 'requested' then 'moved back to Requested'
      when 'in_progress' then 'is now in production'
      when 'review' then 'is ready for review'
      when 'delivered' then 'was approved and delivered'
      else 'changed stage'
    end;
    perform public.log_activity(new.org_id, 'stage_changed', new.id, format('"%s" %s', new.title, v_label));
  end if;
  return new;
end;
$$;

create or replace function public.activity_on_comment()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.requests;
begin
  select * into v_req from public.requests where id = new.request_id;
  if v_req.id is null then return new; end if;
  perform public.log_activity(
    v_req.org_id, 'comment_added', v_req.id,
    format('New %s on "%s"', case when new.visibility = 'internal' then 'internal note' else 'comment' end, v_req.title),
    new.visibility = 'internal'
  );
  return new;
end;
$$;

create or replace function public.activity_on_deliverable()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.requests;
begin
  select * into v_req from public.requests where id = new.request_id;
  if v_req.id is null then return new; end if;
  perform public.log_activity(v_req.org_id, 'file_delivered', v_req.id, format('New file on "%s"', v_req.title));
  return new;
end;
$$;

create or replace function public.activity_on_plan()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'sent' then
      perform public.log_activity(new.org_id, 'plan_sent', null, format('Plan v%s sent for approval', new.version));
    elsif new.status = 'approved' then
      perform public.log_activity(new.org_id, 'plan_approved', null, format('Plan v%s approved', new.version));
    elsif new.status = 'changes_requested' then
      perform public.log_activity(new.org_id, 'plan_changes_requested', null, format('Changes requested on plan v%s', new.version));
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.activity_on_payment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'succeeded' then
    perform public.log_activity(
      new.org_id, 'payment_received', null,
      format('Payment received: %s %s', to_char(new.amount / 100.0, 'FM999,999,990.00'), upper(new.currency))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activity_request on public.requests;
create trigger trg_activity_request after insert or update of stage on public.requests
  for each row execute function public.activity_on_request();

drop trigger if exists trg_activity_comment on public.comments;
create trigger trg_activity_comment after insert on public.comments
  for each row execute function public.activity_on_comment();

drop trigger if exists trg_activity_deliverable on public.deliverables;
create trigger trg_activity_deliverable after insert on public.deliverables
  for each row execute function public.activity_on_deliverable();

drop trigger if exists trg_activity_plan on public.plans;
create trigger trg_activity_plan after update of status on public.plans
  for each row execute function public.activity_on_plan();

drop trigger if exists trg_activity_payment on public.payments;
create trigger trg_activity_payment after insert on public.payments
  for each row execute function public.activity_on_payment();

revoke execute on function
  public.log_activity(uuid, text, uuid, text, boolean),
  public.activity_on_request(),
  public.activity_on_comment(),
  public.activity_on_deliverable(),
  public.activity_on_plan(),
  public.activity_on_payment()
from public, anon, authenticated;

-- ---- Realtime ------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['activity_events', 'requests', 'comments', 'deliverables'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
