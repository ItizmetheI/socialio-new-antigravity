// Deno Edge Function — deploy with `supabase functions deploy create-checkout-session`
// (Phase 1: purchase spine). Needs the service-role key, so it can never run
// client-side; the browser only ever calls it via supabase.functions.invoke().
//
// Design note: the client sends only { serviceId, levelLabel, type } per cart
// item — never a price. Every amount is resolved server-side against
// src/data/services.ts, the same file the pricing pages render from, so a
// tampered request body can never buy anything below the real price.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { servicesData, addOnsData } from "../../../src/data/services.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartLineInput {
  serviceId: string;
  levelLabel: string;
  type: "service" | "addon";
}

interface ResolvedLine {
  serviceId: string;
  title: string;
  tierLabel: string;
  itemType: "service" | "addon";
  billingInterval: "month" | "one_time";
  unitAmount: number; // cents
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Resolves a client-submitted cart line against the real, server-side catalog.
// Returns null if the line doesn't match anything real — the whole request is
// rejected rather than silently dropping a line, so nobody gets a partial
// cart charged at the wrong total.
function resolveLine(input: CartLineInput): ResolvedLine | null {
  if (input.type === "service") {
    const service = servicesData.find((s) => s.id === input.serviceId);
    const step = service?.sliderSteps.find((s) => s.label === input.levelLabel);
    if (!service || !step) return null;
    return {
      serviceId: service.id,
      title: service.title,
      tierLabel: step.label,
      itemType: "service",
      billingInterval: "month",
      unitAmount: Math.round(step.price * 100),
    };
  }
  const addon = addOnsData.find((a) => a.id === input.serviceId);
  if (!addon || input.levelLabel !== "One-time") return null;
  return {
    serviceId: addon.id,
    title: addon.title,
    tierLabel: "One-time",
    itemType: "addon",
    billingInterval: "one_time",
    unitAmount: Math.round(addon.price * 100),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeKey = Deno.env.get("STRIPE_API_KEY");
  const siteUrl = Deno.env.get("SITE_URL");
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !stripeKey || !siteUrl) {
    return jsonResponse({ error: "Edge Function is missing required env vars" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, org_id, role, full_name")
    .eq("id", callerData.user.id)
    .single();
  if (profileError || !profile) {
    return jsonResponse({ error: "Profile not found" }, 404);
  }
  if (profile.role !== "client") {
    return jsonResponse({ error: "Only client accounts can check out" }, 403);
  }

  let body: { items?: CartLineInput[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!body.items || body.items.length === 0) {
    return jsonResponse({ error: "Cart is empty" }, 400);
  }

  const resolved: ResolvedLine[] = [];
  for (const item of body.items) {
    const line = resolveLine(item);
    if (!line) {
      return jsonResponse({ error: `Unrecognized cart item: ${item.serviceId} / ${item.levelLabel}` }, 400);
    }
    resolved.push(line);
  }

  const amountTotal = resolved.reduce((sum, line) => sum + line.unitAmount, 0);
  const mode: "subscription" | "payment" = resolved.some((l) => l.itemType === "service")
    ? "subscription"
    : "payment";

  // First purchase for this profile — create the org now rather than
  // requiring a separate signup step. service-role bypasses RLS and the
  // protect_profile_columns trigger's service_role carve-out.
  let orgId = profile.org_id as string | null;
  if (!orgId) {
    const orgName = profile.full_name
      ? `${profile.full_name}'s Organization`
      : callerData.user.email?.split("@")[0] ?? "New Client";
    const { data: newOrg, error: orgError } = await adminClient
      .from("organizations")
      .insert({ name: orgName })
      .select()
      .single();
    if (orgError || !newOrg) {
      return jsonResponse({ error: orgError?.message ?? "Failed to create organization" }, 500);
    }
    orgId = newOrg.id;
    const { error: linkError } = await adminClient
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", profile.id);
    if (linkError) {
      await adminClient.from("organizations").delete().eq("id", orgId);
      return jsonResponse({ error: linkError.message }, 500);
    }
  }

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .insert({
      org_id: orgId,
      created_by: profile.id,
      amount_subtotal: amountTotal,
      amount_total: amountTotal,
    })
    .select()
    .single();
  if (orderError || !order) {
    return jsonResponse({ error: orderError?.message ?? "Failed to create order" }, 500);
  }

  const { error: itemsError } = await adminClient.from("order_items").insert(
    resolved.map((line) => ({
      order_id: order.id,
      service_id: line.serviceId,
      tier_label: line.tierLabel,
      item_type: line.itemType,
      billing_interval: line.billingInterval,
      unit_amount: line.unitAmount,
      quantity: 1,
    })),
  );
  if (itemsError) {
    return jsonResponse({ error: itemsError.message }, 500);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });

  const line_items = resolved.map((line) => ({
    price_data: {
      currency: "usd",
      product_data: { name: `${line.title} — ${line.tierLabel}` },
      unit_amount: line.unitAmount,
      ...(line.billingInterval === "month" ? { recurring: { interval: "month" as const } } : {}),
    },
    quantity: 1,
  }));

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode,
      line_items,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout`,
      customer_email: callerData.user.email ?? undefined,
      metadata: { org_id: orgId, order_id: order.id },
    });
  } catch (err) {
    // Roll back the pending order (order_items cascade with it) so a Stripe
    // outage/error doesn't leave stale rows behind on every retry — same
    // discipline as invite-client's orphan-org rollback. Deliberately NOT
    // rolling back a newly-created org/profile-link: that state is valid on
    // its own (a signed-up-but-not-yet-purchased client) and reusing it on
    // retry avoids creating a fresh duplicate org on every failed attempt.
    await adminClient.from("orders").delete().eq("id", order.id);
    return jsonResponse({ error: err instanceof Error ? err.message : "Stripe error" }, 502);
  }

  const { error: sessionSaveError } = await adminClient
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", order.id);
  if (sessionSaveError) {
    return jsonResponse({ error: sessionSaveError.message }, 500);
  }

  return jsonResponse({ url: session.url }, 200);
});
