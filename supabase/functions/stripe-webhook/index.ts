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
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { servicesData, addOnsData } from "../../../src/data/services.ts";
import { orderConfirmationEmail } from "../_shared/orderEmail.ts";

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

  // Stripe doesn't guarantee delivery order: an older "created (incomplete)"
  // event can land after "updated (active)" and roll the status back (seen in
  // test mode). For subscription events, apply the subscription's CURRENT
  // state from Stripe instead of the event's snapshot, so order can't matter.
  let payload: Stripe.Event = event;
  if (event.type.startsWith("customer.subscription.")) {
    const snapshot = event.data.object as Stripe.Subscription;
    try {
      const current = await stripe.subscriptions.retrieve(snapshot.id);
      payload = { ...event, data: { ...event.data, object: current } } as Stripe.Event;
    } catch (err) {
      return new Response(`Couldn't fetch subscription: ${err instanceof Error ? err.message : "unknown"}`, { status: 500 });
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await adminClient.rpc(rpcName, {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: payload as unknown as Record<string, unknown>,
  });
  if (error) {
    // Non-2xx so Stripe retries — e.g. subscription.updated can legitimately
    // arrive before the checkout.session.completed that creates the order.
    return new Response(`Handler failed: ${error.message}`, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const emailError = await sendOrderConfirmation(adminClient, stripe, event.data.object as Stripe.Checkout.Session);
    if (emailError) {
      // The order is recorded (the RPC is idempotent); a retry only re-tries the email.
      return new Response(`Order recorded; confirmation email failed: ${emailError}`, { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
});

const titleFor = (id: string) =>
  servicesData.find((s) => s.id === id)?.title ?? addOnsData.find((a) => a.id === id)?.title ?? id;

// "You're in" email to the buyer, once per order. The conditional update is
// the lock: of any duplicate or concurrent deliveries, exactly one claims the
// order and sends. If sending fails the claim is released and the error goes
// back to Stripe, whose retry tries again. Returns an error message or null.
async function sendOrderConfirmation(
  admin: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set; order confirmation email skipped");
    return null;
  }
  const { data: order, error: claimError } = await admin
    .from("orders")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("stripe_checkout_session_id", session.id)
    .is("confirmation_email_sent_at", null)
    .select("id, created_by, amount_total, currency")
    .maybeSingle();
  if (claimError) return claimError.message;
  if (!order) return null; // already sent by an earlier delivery

  try {
    const [itemsRes, userRes] = await Promise.all([
      admin.from("order_items").select("service_id, tier_label, unit_amount, quantity, billing_interval").eq("order_id", order.id),
      admin.auth.admin.getUserById(order.created_by),
    ]);
    const to = userRes.data.user?.email;
    if (itemsRes.error || userRes.error || !to) {
      throw new Error(itemsRes.error?.message ?? userRes.error?.message ?? "buyer has no email address");
    }
    const nextChargeAt = typeof session.subscription === "string"
      ? new Date((await stripe.subscriptions.retrieve(session.subscription)).current_period_end * 1000)
      : null;
    const email = orderConfirmationEmail({
      siteUrl: Deno.env.get("SITE_URL") ?? "https://socialio.io",
      name: (userRes.data.user?.user_metadata?.full_name as string | undefined) ?? null,
      lines: (itemsRes.data ?? []).map((i) => ({
        title: titleFor(i.service_id),
        tier: i.tier_label,
        cents: i.unit_amount * i.quantity,
        monthly: i.billing_interval === "month",
      })),
      paidCents: order.amount_total,
      currency: order.currency,
      nextChargeAt,
      orderRef: order.id.slice(0, 8).toUpperCase(),
    });
    const res = await fetch(Deno.env.get("RESEND_API_URL") ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        // Belt and braces: Resend drops a repeat of this key for 24h.
        "Idempotency-Key": `order-confirmation-${order.id}`,
      },
      body: JSON.stringify({
        from: "Socialio <noreply@socialio.io>",
        to: [to],
        reply_to: "support@socialio.io",
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  } catch (err) {
    await admin.from("orders").update({ confirmation_email_sent_at: null }).eq("id", order.id);
    return err instanceof Error ? err.message : "unknown error";
  }
}
