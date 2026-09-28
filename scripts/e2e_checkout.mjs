// End-to-end check of the purchase spine against the live project + Stripe
// TEST mode. Three steps, run one at a time:
//
//   start   – creates a throwaway client account, checks the function's
//             guards (signed-out / unknown item rejected), then asks
//             create-checkout-session for a real Stripe Checkout URL
//             (one monthly service + one one-time add-on). Pay it with
//             Stripe's test card 4242 4242 4242 4242.
//   verify  – after paying: order paid, org active + linked, subscription,
//             one payment, one stripe_events row per event.
//   cleanup – cancels the Stripe test subscription, deletes the test
//             org (orders/items/payments cascade) and user.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY
// (sk_test_ only — refuses a live key). State between steps is kept in
// e2e_checkout.state.json next to this file (gitignored by *.state.json).
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY || !STRIPE_SECRET_KEY) {
  console.error("Missing env: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY");
  process.exit(1);
}
if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("Refusing to run with a non-test Stripe key.");
  process.exit(1);
}

const STATE_FILE = new URL("./e2e_checkout.state.json", import.meta.url);
const FN = `${SUPABASE_URL}/functions/v1/create-checkout-session`;
const CART = [
  { serviceId: "social-media-posts", levelLabel: "10 Posts", type: "service" },
  { serviceId: "rush-delivery", levelLabel: "One-time", type: "addon" },
];
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
};
const stripe = async (path, init = {}) =>
  (await fetch(`https://api.stripe.com/v1/${path}`, { ...init, headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, ...init.headers } })).json();

async function start() {
  const stamp = Date.now();
  const email = `e2e-checkout-${stamp}@socialio-internal-test.com`;
  const password = `Test-${stamp}!Aa1`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const userId = created.user.id;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signIn } = await client.auth.signInWithPassword({ email, password });
  const token = signIn.session.access_token;
  const call = (body, headers = {}) =>
    fetch(FN, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json", Origin: "http://localhost:3000", ...headers }, body: JSON.stringify(body) });

  const anon = await call({ items: CART });
  check("signed-out visitor can't start checkout", anon.status === 401, `status ${anon.status}`);
  const bogus = await call({ items: [{ serviceId: "social-media-posts", levelLabel: "1 Post for $1", type: "service" }] }, { Authorization: `Bearer ${token}` });
  check("made-up tier/price is rejected", bogus.status === 400, `status ${bogus.status}`);

  const res = await call({ items: CART }, { Authorization: `Bearer ${token}` });
  const body = await res.json();
  check("signed-in client gets a Stripe Checkout URL", res.ok && body.url?.startsWith("https://checkout.stripe.com/"), body.error);
  const { data: orderRow, error: orderError } = await admin.from("orders").select("*").eq("created_by", userId).single();
  if (orderError) throw orderError;
  const session = await stripe(`checkout/sessions/${orderRow.stripe_checkout_session_id}`);
  check("order total matches the price list ($79 + $49)", orderRow.amount_total === 12800 && session.amount_total === 12800, `order ${orderRow.amount_total}, stripe ${session.amount_total}`);
  check("Stripe returns the customer to the site they came from", session.success_url?.startsWith("http://localhost:3000/checkout/success"), session.success_url);

  writeFileSync(STATE_FILE, JSON.stringify({ userId, email, orderId: orderRow.id, orgId: orderRow.org_id, sessionId: session.id }, null, 2));
  console.log(`\nPay here with 4242 4242 4242 4242 (any future date, any CVC):\n${body.url}\n`);
}

async function verify() {
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  const { data: order } = await admin.from("orders").select("*").eq("id", state.orderId).single();
  check("order is marked paid", order.status === "paid", order.status);
  const { data: org } = await admin.from("organizations").select("*").eq("id", order.org_id).single();
  check("client's organization is active", org?.status === "active", org?.status);
  const { data: profile } = await admin.from("profiles").select("org_id").eq("id", state.userId).single();
  check("the buyer's account is linked to that organization", profile.org_id === order.org_id);
  const { data: subs } = await admin.from("subscriptions").select("*").eq("org_id", order.org_id);
  // "active", not "incomplete": Stripe can deliver subscription events out of
  // order, so the webhook must apply the subscription's current state.
  check("subscription recorded and active", subs?.length === 1 && subs[0].status === "active", `${subs?.length} rows, status ${subs?.[0]?.status}`);
  const session = await stripe(`checkout/sessions/${state.sessionId}`);
  check("charged in USD (no local-currency conversion)", session.currency === "usd" && session.adaptive_pricing?.enabled === false, session.currency);
  const { data: payments } = await admin.from("payments").select("*").eq("org_id", order.org_id);
  check("exactly one payment recorded, for $128", payments?.length === 1 && payments[0].amount === 12800, `${payments?.length} rows, ${payments?.[0]?.amount}`);
  const { data: events } = await admin.from("stripe_events").select("id, type");
  const mine = (events ?? []).filter((e) => e.type === "checkout.session.completed");
  check("checkout.session.completed stored once (idempotency ledger)", mine.length >= 1 && new Set(mine.map((e) => e.id)).size === mine.length);
  state.subscriptionId = session.subscription;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function cleanup() {
  if (!existsSync(STATE_FILE)) return console.log("Nothing to clean up.");
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  const session = await stripe(`checkout/sessions/${state.sessionId}`);
  if (session.subscription) {
    const cancelled = await stripe(`subscriptions/${session.subscription}`, { method: "DELETE" });
    console.log(`Stripe test subscription ${session.subscription}: ${cancelled.status ?? cancelled.error?.message}`);
  }
  const { data: order } = await admin.from("orders").select("org_id").eq("id", state.orderId).maybeSingle();
  const orgId = order?.org_id ?? state.orgId;
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  await admin.auth.admin.deleteUser(state.userId);
  unlinkSync(STATE_FILE);
  console.log("Removed test org and user.");
}

const step = process.argv[2];
try {
  if (step === "start") await start();
  else if (step === "verify") await verify();
  else if (step === "cleanup") await cleanup();
  else console.log("Usage: node scripts/e2e_checkout.mjs start|verify|cleanup");
} catch (err) {
  check("script ran without throwing", false, err.message);
}
if (results.length) {
  const failed = results.filter((ok) => !ok).length;
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
