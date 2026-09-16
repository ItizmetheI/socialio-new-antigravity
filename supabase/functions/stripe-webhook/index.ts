// Deno Edge Function — deploy with `supabase functions deploy stripe-webhook`
// (Phase 1: purchase spine). verify_jwt = false (see ../../config.toml) since
// Stripe calls this directly with no Supabase session — the signature check
// below is the only authentication this endpoint has.
//
// Design note: this handler is deliberately thin — verify the signature,
// route by event type, hand the raw payload to one SECURITY DEFINER SQL
// function per event type. All the actual state transitions (and the
// idempotency check) live in Postgres, matching schema.sql's existing
// philosophy, so a partial JS failure can never leave the database
// half-updated.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const HANDLED_EVENT_TO_RPC: Record<string, string> = {
  "checkout.session.completed": "handle_stripe_checkout_completed",
  "invoice.paid": "handle_stripe_invoice_paid",
  "customer.subscription.created": "handle_stripe_subscription_updated",
  "customer.subscription.updated": "handle_stripe_subscription_updated",
  "customer.subscription.deleted": "handle_stripe_subscription_deleted",
};

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_API_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !stripeKey || !webhookSecret) {
    return new Response("Edge Function is missing required env vars", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Raw text, not .json() — Stripe's signature check needs the exact bytes
  // that were sent, before any JSON re-serialization could change them.
  const body = await req.text();

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return new Response(`Signature verification failed: ${err instanceof Error ? err.message : "unknown"}`, {
      status: 400,
    });
  }

  const rpcName = HANDLED_EVENT_TO_RPC[event.type];
  if (!rpcName) {
    // Ack receipt of event types we don't act on — Stripe retries on non-2xx.
    return new Response("ok (unhandled event type)", { status: 200 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await adminClient.rpc(rpcName, {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: event as unknown as Record<string, unknown>,
  });
  if (error) {
    // Non-2xx so Stripe retries — e.g. subscription.updated can legitimately
    // arrive before the checkout.session.completed that creates the order.
    return new Response(`Handler failed: ${error.message}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
