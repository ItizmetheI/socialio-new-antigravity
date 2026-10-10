// Deno Edge Function — a client cancels their monthly plan, or undoes that
// before it ends. Plans are paid monthly up front, so cancelling never cuts
// the current month: Stripe's cancel_at_period_end stops the NEXT renewal and
// the plan keeps running until current_period_end. verify_jwt = true.
//
// Body: { subscriptionId: <subscriptions.id>, action: "cancel" | "resume" }.
// Only an active client of the subscription's own org may change it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import Stripe from "npm:stripe@17";

const LIVE_STATUSES = ["active", "trialing", "past_due", "unpaid"];

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  const jsonResponse = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeKey = Deno.env.get("STRIPE_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !stripeKey) {
    return jsonResponse({ error: "Edge Function is missing required env vars" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError && !(callerError.status && callerError.status >= 400 && callerError.status < 500)) {
    return jsonResponse({ error: "Billing is busy right now. Please try again in a few seconds." }, 503);
  }
  if (callerError || !callerData.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  let body: { subscriptionId?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const { subscriptionId, action } = body;
  if (typeof subscriptionId !== "string" || (action !== "cancel" && action !== "resume")) {
    return jsonResponse({ error: "Send a subscriptionId and an action of cancel or resume" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role, is_active")
    .eq("id", callerData.user.id)
    .single();
  if (!profile || profile.is_active === false || profile.role !== "client" || !profile.org_id) {
    return jsonResponse({ error: "Only an active client account can change its plan" }, 403);
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, stripe_subscription_id, status, cancel_at_period_end")
    .eq("id", subscriptionId)
    .eq("org_id", profile.org_id)
    .maybeSingle();
  if (!sub) {
    return jsonResponse({ error: "Subscription not found" }, 404);
  }
  if (!LIVE_STATUSES.includes(sub.status)) {
    return jsonResponse({ error: "This plan has already ended" }, 409);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: action === "cancel" });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Stripe error" }, 502);
  }

  // Record it now so the dashboard (and the admin's notice) don't wait for the
  // webhook; Stripe's customer.subscription.updated then writes the same values.
  const row = {
    status: updated.status,
    cancel_at_period_end: updated.cancel_at_period_end,
    current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error: saveError } = await admin.from("subscriptions").update(row).eq("id", sub.id);
  if (saveError) {
    // Stripe already has the change and its webhook will sync this row.
    console.error("manage-subscription: saved in Stripe, local update failed", saveError.message);
  }

  return jsonResponse({ cancel_at_period_end: row.cancel_at_period_end, current_period_end: row.current_period_end, status: row.status }, 200);
});
