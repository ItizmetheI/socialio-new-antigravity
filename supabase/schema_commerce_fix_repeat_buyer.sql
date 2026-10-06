-- ============================================================================
-- Record a repeat buyer's subscription.
--
-- Checkout sessions are created with customer_email, so every purchase gets a
-- new Stripe customer, but organizations.stripe_customer_id keeps the first
-- one. A client's second purchase (or a second tab paid on the first visit)
-- then failed every subscription webhook with "no matching organization" and
-- the subscription was never recorded. Match on the order first —
-- handle_stripe_checkout_completed stores the subscription id on it — and
-- fall back to the customer. Still raises (so Stripe retries) when neither
-- has landed yet. Run after schema_commerce.sql.
-- ============================================================================

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

  v_org_id := coalesce(
    (select org_id from public.orders where stripe_subscription_id = v_stripe_sub_id limit 1),
    (select id from public.organizations where stripe_customer_id = v_stripe_customer_id limit 1)
  );
  if v_org_id is null then
    raise exception 'no matching organization for stripe subscription % / customer %', v_stripe_sub_id, v_stripe_customer_id;
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

revoke all on function public.handle_stripe_subscription_updated(text, text, jsonb) from public, anon, authenticated;
