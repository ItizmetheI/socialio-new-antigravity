-- ============================================================================
-- Order ledger: what a client bought, what's been used, what's left.
-- Additive only. Run after schema_workspace.sql.
--
-- The ledger itself is computed in the browser (src/components/workspace/
-- LedgerData.tsx) from orders / order_items / subscriptions / requests, all of
-- which already have org-scoped RLS — so a client can only ever tally their
-- own purchases and nothing here needs a SECURITY DEFINER read path.
-- ============================================================================

-- ---- order_items.units: how many pieces a purchased line is worth ----------
-- "10 Posts" -> 10. create-checkout-session should write this from
-- sliderSteps[].amount (add-ons: 1). Until it does, new rows land as null and
-- the ledger falls back to the first number in tier_label, else 1.
alter table public.order_items
  add column if not exists units integer check (units between 1 and 1000);

-- Backfill: every tier label in services.ts starts with its amount ("10 Posts",
-- "3 Backlinks"); "Monthly" (instagram-growth) and "One-time" (add-ons) have
-- no digits and mean one unit.
update public.order_items
set units = coalesce(nullif(substring(tier_label from '\d+'), '')::integer, 1)
where units is null;

-- ---- requests: which purchased line a piece of work draws down -------------
alter table public.requests
  add column if not exists order_item_id uuid references public.order_items(id) on delete set null,
  add column if not exists units integer not null default 1 check (units between 1 and 100);

create index if not exists idx_requests_order_item_id on public.requests(order_item_id);

-- A request may only point at an order line bought by the request's own org.
-- Runs for everyone (staff included) on every insert/update that carries a
-- line, so moving a request's org_id re-checks it too. SECURITY DEFINER so the
-- lookup ignores RLS; the error is identical for "someone else's line" and
-- "no such line", so it can't be used to probe other orgs' ids.
create or replace function public.check_request_order_item()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.order_item_id is not null and not exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = new.order_item_id and o.org_id = new.org_id
  ) then
    raise exception 'order item does not belong to this organization';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_3_check_request_order_item on public.requests;
create trigger trg_3_check_request_order_item
  before insert or update on public.requests
  for each row execute function public.check_request_order_item();

-- Latest protect_request_columns (schema_workspace.sql) plus:
--   units         staff-only — the team decides what a piece of work costs.
--   order_item_id clients may pick/change the line only while the request is
--                 still 'requested'; once we've taken it on, unlinking it
--                 would quietly refund used balance.
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
      or new.created_by is distinct from old.created_by
      or new.units is distinct from old.units then
      raise exception 'not permitted to change this field';
    end if;
    if new.order_item_id is distinct from old.order_item_id and old.stage <> 'requested' then
      raise exception 'not permitted to change this field';
    end if;
  end if;
  return new;
end;
$$;

-- Clients' new requests always cost the default 1 unit; staff re-price.
drop policy if exists "clients create own org requests" on public.requests;
create policy "clients create own org requests" on public.requests
  for insert to authenticated with check (
    org_id = public.my_org_id()
    and stage = 'requested'
    and assigned_to is null
    and publish_at is null
    and units = 1
    and created_by = auth.uid()
  );

revoke execute on function public.check_request_order_item(), public.protect_request_columns()
  from public, anon, authenticated;
