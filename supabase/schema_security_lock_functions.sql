-- ============================================================================
-- SECURITY FIX: nobody but the server may run the payment handlers.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and
-- PostgREST exposes public-schema functions at /rest/v1/rpc/<name>. So any
-- visitor could call handle_stripe_checkout_completed with a made-up payload
-- for their own checkout session id and mark the order paid without paying.
-- Only the stripe-webhook Edge Function (service_role) may run these now.
--
-- Trigger functions are locked too: triggers still fire (EXECUTE isn't
-- checked when a trigger runs), they just can't be called directly.
-- is_staff / is_admin / my_org_id / my_role stay callable: every RLS policy
-- uses them, and they only reveal the caller's own role/org.
-- ============================================================================

revoke execute on function
  public.handle_stripe_checkout_completed(text, text, jsonb),
  public.handle_stripe_invoice_paid(text, text, jsonb),
  public.handle_stripe_subscription_updated(text, text, jsonb),
  public.handle_stripe_subscription_deleted(text, text, jsonb)
from public, anon, authenticated;

grant execute on function
  public.handle_stripe_checkout_completed(text, text, jsonb),
  public.handle_stripe_invoice_paid(text, text, jsonb),
  public.handle_stripe_subscription_updated(text, text, jsonb),
  public.handle_stripe_subscription_deleted(text, text, jsonb)
to service_role;

revoke execute on function
  public.handle_new_user(),
  public.create_requests_from_plan(),
  public.create_requests_from_proposal(),
  public.supersede_previous_plan(),
  public.protect_onboarding_columns(),
  public.protect_organization_columns(),
  public.protect_plan_columns(),
  public.protect_profile_columns(),
  public.protect_proposal_columns(),
  public.protect_request_columns()
from public, anon, authenticated;

-- Future functions in public start locked; grant explicitly when needed.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
