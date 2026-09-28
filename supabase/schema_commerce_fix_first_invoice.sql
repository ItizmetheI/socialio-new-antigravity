-- ============================================================================
-- Don't record a subscription's first payment twice.
--
-- A subscription checkout fires both checkout.session.completed (recorded as
-- a payment by handle_stripe_checkout_completed) and invoice.paid for the
-- very same first invoice. If customer.subscription.created was processed
-- before invoice.paid, the invoice handler found the subscription row and
-- inserted a second payment for the same money, doubling revenue. The first
-- invoice (billing_reason = 'subscription_create') is now skipped here;
-- renewals ('subscription_cycle') are still recorded. Run after
-- schema_commerce.sql.
-- ============================================================================

create or replace function public.handle_stripe_invoice_paid(
  p_event_id text, p_event_type text, p_payload jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_invoice jsonb := p_payload -> 'data' -> 'object';
  v_stripe_sub_id text := v_invoice ->> 'subscription';
  v_sub public.subscriptions;
begin
  insert into public.stripe_events (id, type, payload) values (p_event_id, p_event_type, p_payload)
    on conflict (id) do nothing;
  if not found then return; end if;

  if v_stripe_sub_id is null then return; end if; -- one-time invoice, no subscription row to touch
  -- Already recorded from checkout.session.completed.
  if v_invoice ->> 'billing_reason' = 'subscription_create' then return; end if;

  select * into v_sub from public.subscriptions where stripe_subscription_id = v_stripe_sub_id;
  if v_sub.id is null then return; end if; -- subscription.created webhook hasn't landed yet; skip, not fatal

  insert into public.payments (org_id, subscription_id, status, amount, currency, stripe_invoice_id)
  values (
    v_sub.org_id, v_sub.id, 'succeeded',
    (v_invoice ->> 'amount_paid')::integer,
    v_invoice ->> 'currency',
    v_invoice ->> 'id'
  )
  on conflict (stripe_invoice_id) do nothing;
end;
$$;

revoke all on function public.handle_stripe_invoice_paid(text, text, jsonb) from public, anon, authenticated;
