-- ============================================================================
-- Socialio Dashboard — Commerce schema (Phase 1: purchase spine)
-- ============================================================================
-- Additive on top of schema.sql — nothing here drops or alters existing rows.
-- Design rationale: C:\Users\ahmed\.claude\plans\steady-crafting-wren.md
--
-- Every commerce table is SELECT-only for authenticated users. Writes only
-- ever happen through create-checkout-session / stripe-webhook using the
-- service-role key, which bypasses RLS — not even an admin can hand-edit an
-- order/payment/subscription row from the UI. Run this whole file once,
-- after schema.sql, in the Supabase SQL Editor (or via the Management API).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- organizations gets two new columns (ALTER, not a new table)
-- ----------------------------------------------------------------------------
alter table public.organizations
  add column stripe_customer_id text unique,
  add column status text not null default 'prospect'
    check (status in ('prospect', 'active', 'paused', 'canceled'));
-- 'prospect' = signed up, hasn't paid. 'active' = has a paid order. This is
-- the source of truth for "onboarding incomplete" gating — deliberately NOT
-- reused from profiles.is_active, which already means staff deactivation.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  currency text not null default 'usd',
  amount_subtotal integer not null check (amount_subtotal >= 0), -- cents, never float
  amount_total integer not null check (amount_total >= 0),
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text, -- null if addons-only (mode='payment')
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id text not null,   -- matches an id in src/data/services.ts
  tier_label text not null,   -- matches sliderSteps[].label, or "One-time" for addons
  item_type text not null check (item_type in ('service', 'addon')),
  billing_interval text not null check (billing_interval in ('month', 'one_time')),
  unit_amount integer not null check (unit_amount >= 0), -- cents, snapshotted at purchase
  quantity integer not null default 1 check (quantity > 0)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  stripe_subscription_id text not null unique,
  status text not null check (status in
    ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text unique,
  status text not null check (status in ('succeeded', 'failed', 'refunded')),
  amount integer not null check (amount >= 0),
  currency text not null default 'usd',
  created_at timestamptz not null default now()
);

-- Idempotency ledger AND audit trail for every payment-state change in one
-- table. The unique PK on `id` (the Stripe event id) IS the idempotency
-- guard — every handle_stripe_* function below inserts here first and bails
-- out if the row already existed.
create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index idx_orders_org_id on public.orders(org_id);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_subscriptions_org_id on public.subscriptions(org_id);
create index idx_payments_org_id on public.payments(org_id);
create index idx_payments_subscription_id on public.payments(subscription_id);

-- ----------------------------------------------------------------------------
-- Two required edits to existing schema.sql functions
-- ----------------------------------------------------------------------------

-- 1. Read role/org_id from app_metadata (service-role-only-settable) instead
--    of user_metadata (client-settable via public signUp()). Once self-serve
--    signup exists, user_metadata is a privilege-escalation vector — anyone
--    could pass {data: {role: 'admin'}}. full_name stays a normal, low-stakes
--    field and can still come from either source at signup.
--    invite-client/index.ts's inviteUserByEmail call must switch from
--    `data: {...}` to `app_metadata: {...}` for role/org_id to match.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, org_id, role, full_name)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'org_id', '')::uuid,
    coalesce(new.raw_app_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_app_meta_data ->> 'full_name')
  );
  return new;
end;
$$;

-- 2. A bare service-role call has auth.uid() = null, so is_admin() is false,
--    so this trigger would otherwise block create-checkout-session from ever
--    setting profiles.org_id on a client's first purchase. Strict superset
--    of the current behavior — nothing previously allowed becomes disallowed.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    if new.role is distinct from old.role
      or new.org_id is distinct from old.org_id
      or new.is_active is distinct from old.is_active then
      raise exception 'not permitted to change role, org_id, or is_active';
    end if;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- New trigger: lock organizations.stripe_customer_id/status to service-role
-- writes only — not even an admin can hand-edit them from the UI, only the
-- webhook-driven functions below may.
-- ----------------------------------------------------------------------------
create or replace function public.protect_organization_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.status is distinct from old.status then
      raise exception 'not permitted to change stripe_customer_id or status';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_1_protect_organization_columns
  before update on public.organizations
  for each row execute function public.protect_organization_columns();

-- ----------------------------------------------------------------------------
-- Webhook-processing functions — one per Stripe event type, service-role RPC
-- targets only (never granted to anon/authenticated). Each starts with the
-- idempotency insert: if the event id is already in stripe_events, bail out
-- before touching anything else, so a Stripe webhook retry can never double-
-- apply a payment.
-- ----------------------------------------------------------------------------

create or replace function public.handle_stripe_checkout_completed(
  p_event_id text, p_event_type text, p_payload jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_session_id text := p_payload -> 'data' -> 'object' ->> 'id';
  v_order public.orders;
begin
  insert into public.stripe_events (id, type, payload) values (p_event_id, p_event_type, p_payload)
    on conflict (id) do nothing;
  if not found then return; end if;

  select * into v_order from public.orders where stripe_checkout_session_id = v_session_id;
  if v_order.id is null then
    raise exception 'no matching order for checkout session %', v_session_id;
  end if;

  update public.orders set
    status = 'paid',
    paid_at = now(),
    stripe_customer_id = p_payload -> 'data' -> 'object' ->> 'customer',
    stripe_subscription_id = p_payload -> 'data' -> 'object' ->> 'subscription'
  where id = v_order.id;

  update public.organizations set
    status = 'active',
    stripe_customer_id = coalesce(stripe_customer_id, p_payload -> 'data' -> 'object' ->> 'customer')
  where id = v_order.org_id;

  insert into public.payments (org_id, order_id, status, amount, currency, stripe_payment_intent_id)
  values (
    v_order.org_id, v_order.id, 'succeeded',
    (p_payload -> 'data' -> 'object' ->> 'amount_total')::integer,
    p_payload -> 'data' -> 'object' ->> 'currency',
    p_payload -> 'data' -> 'object' ->> 'payment_intent'
  );
end;
$$;

create or replace function public.handle_stripe_invoice_paid(
  p_event_id text, p_event_type text, p_payload jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_stripe_sub_id text := p_payload -> 'data' -> 'object' ->> 'subscription';
  v_sub public.subscriptions;
begin
  insert into public.stripe_events (id, type, payload) values (p_event_id, p_event_type, p_payload)
    on conflict (id) do nothing;
  if not found then return; end if;

  if v_stripe_sub_id is null then return; end if; -- one-time invoice, no subscription row to touch

  select * into v_sub from public.subscriptions where stripe_subscription_id = v_stripe_sub_id;
  if v_sub.id is null then return; end if; -- subscription.created webhook hasn't landed yet; skip, not fatal

  insert into public.payments (org_id, subscription_id, status, amount, currency, stripe_invoice_id)
  values (
    v_sub.org_id, v_sub.id, 'succeeded',
    (p_payload -> 'data' -> 'object' ->> 'amount_paid')::integer,
    p_payload -> 'data' -> 'object' ->> 'currency',
    p_payload -> 'data' -> 'object' ->> 'id'
  )
  on conflict (stripe_invoice_id) do nothing;
end;
$$;

create or replace function public.handle_stripe_subscription_updated(
  p_event_id text, p_event_type text, p_payload jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_obj jsonb := p_payload -> 'data' -> 'object';
  v_stripe_sub_id text := v_obj ->> 'id';
  v_stripe_customer_id text := v_obj ->> 'customer';
  v_org_id uuid;
begin
  insert into public.stripe_events (id, type, payload) values (p_event_id, p_event_type, p_payload)
    on conflict (id) do nothing;
  if not found then return; end if;

  select id into v_org_id from public.organizations where stripe_customer_id = v_stripe_customer_id;
  if v_org_id is null then
    raise exception 'no matching organization for stripe customer %', v_stripe_customer_id;
  end if;

  insert into public.subscriptions (
    org_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end
  )
  values (
    v_org_id, v_stripe_sub_id, v_obj ->> 'status',
    to_timestamp((v_obj ->> 'current_period_end')::bigint),
    coalesce((v_obj ->> 'cancel_at_period_end')::boolean, false)
  )
  on conflict (stripe_subscription_id) do update set
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();
end;
$$;

create or replace function public.handle_stripe_subscription_deleted(
  p_event_id text, p_event_type text, p_payload jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_stripe_sub_id text := p_payload -> 'data' -> 'object' ->> 'id';
begin
  insert into public.stripe_events (id, type, payload) values (p_event_id, p_event_type, p_payload)
    on conflict (id) do nothing;
  if not found then return; end if;

  update public.subscriptions set status = 'canceled', updated_at = now()
  where stripe_subscription_id = v_stripe_sub_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security — SELECT only, client: own org, staff: everything.
-- stripe_events gets NO grant at all: not even staff can read it from the
-- browser, only service-role. It exists purely as the idempotency ledger +
-- a de facto payment audit trail.
-- ----------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_events enable row level security;

revoke all on public.orders, public.order_items, public.subscriptions, public.payments,
  public.stripe_events from anon, authenticated;

grant select on public.orders, public.order_items, public.subscriptions, public.payments to authenticated;

create policy "clients read own org orders" on public.orders
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all orders" on public.orders
  for select to authenticated using (public.is_staff());

create policy "clients read own org order items" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.org_id = public.my_org_id()
    )
  );
create policy "staff read all order items" on public.order_items
  for select to authenticated using (public.is_staff());

create policy "clients read own org subscriptions" on public.subscriptions
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all subscriptions" on public.subscriptions
  for select to authenticated using (public.is_staff());

create policy "clients read own org payments" on public.payments
  for select to authenticated using (org_id = public.my_org_id());
create policy "staff read all payments" on public.payments
  for select to authenticated using (public.is_staff());

-- ============================================================================
-- Manual verification checklist — extends schema.sql's checklist.
-- ============================================================================
-- scripts/verify_rls.mjs covers the RLS/table-access items below without
-- needing Stripe keys (it seeds orders/payments directly, bypassing
-- checkout). The items that actually need a live Stripe integration
-- (signed-out rejection, price tampering, webhook replay) need Stripe
-- test-mode keys first — see steady-crafting-wren.md's rollout sequencing.
--
-- [ ] Signed-out visitor: calling create-checkout-session is rejected (401).
-- [ ] Client with a fabricated price in the request body: rejected — the
--     function only trusts serviceId/levelLabel lookups against services.ts,
--     never a client-submitted amount.
-- [x] Replaying the same stripe-webhook event twice is a no-op (stripe_events
--     unique PK), no duplicate payments row. Verified via
--     scripts/verify_webhook_idempotency.mjs, which calls
--     handle_stripe_checkout_completed directly by RPC — the actual Stripe
--     signature verification in the Edge Function itself still isn't
--     exercised, since that needs real Stripe keys.
-- [x] Client A: select on orders/payments returns zero rows from org B, even
--     with a guessed UUID. (subscriptions not yet seeded/tested — same
--     org-scoped policy pattern as orders/payments, not independently run.)
-- [x] Client A: UPDATE on orders and organizations.status from the browser
--     is rejected — service-role only. (payments/subscriptions UPDATE not
--     independently tested — same no-grant-at-all pattern as orders.)
-- [x] stripe_events: authenticated select (staff or client) returns zero
--     rows — no grant exists at all.
