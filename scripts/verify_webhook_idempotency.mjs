// Security regression check — verifies handle_stripe_checkout_completed's
// idempotency directly via RPC, bypassing the stripe-webhook Edge Function
// (which needs real Stripe keys/signatures to invoke at all). This tests the
// actual guarantee that matters: replaying the same Stripe event id can
// never create a duplicate payment or double-apply a state transition.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/verify_webhook_idempotency.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}
const admin = createClient(URL, SERVICE_KEY);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
}

const stamp = Date.now();
const created = { orgIds: [], userIds: [], orderIds: [] };

async function main() {
  const { data: org } = await admin.from("organizations").insert({ name: `Webhook Test Org ${stamp}` }).select().single();
  created.orgIds.push(org.id);

  const { data: user } = await admin.auth.admin.createUser({
    email: `webhook-test-${stamp}@socialio-internal-test.com`,
    password: `Test-${stamp}!Aa1`,
    email_confirm: true,
  });
  created.userIds.push(user.user.id);
  await admin.from("profiles").update({ role: "client", org_id: org.id }).eq("id", user.user.id);

  const sessionId = `cs_test_webhook_${stamp}`;
  const { data: order } = await admin
    .from("orders")
    .insert({
      org_id: org.id, created_by: user.user.id, amount_subtotal: 7900, amount_total: 7900,
      stripe_checkout_session_id: sessionId,
    })
    .select()
    .single();
  created.orderIds.push(order.id);

  const eventId = `evt_test_${stamp}`;
  const payload = {
    data: {
      object: {
        id: sessionId,
        customer: `cus_test_${stamp}`,
        subscription: null,
        amount_total: 7900,
        currency: "usd",
        payment_intent: `pi_test_${stamp}`,
      },
    },
  };

  const { error: firstCallErr } = await admin.rpc("handle_stripe_checkout_completed", {
    p_event_id: eventId, p_event_type: "checkout.session.completed", p_payload: payload,
  });
  check("first webhook call succeeds", !firstCallErr, firstCallErr?.message);

  const { data: orderAfterFirst } = await admin.from("orders").select("status, paid_at").eq("id", order.id).single();
  check("order flips to paid after first call", orderAfterFirst?.status === "paid", `status: ${orderAfterFirst?.status}`);

  const { data: orgAfterFirst } = await admin.from("organizations").select("status").eq("id", org.id).single();
  check("organization flips to active after first call", orgAfterFirst?.status === "active", `status: ${orgAfterFirst?.status}`);

  const { data: paymentsAfterFirst } = await admin.from("payments").select("*").eq("order_id", order.id);
  check("exactly one payment row after first call", paymentsAfterFirst?.length === 1, `${paymentsAfterFirst?.length} rows`);

  // Replay the identical event — must be a complete no-op.
  const { error: secondCallErr } = await admin.rpc("handle_stripe_checkout_completed", {
    p_event_id: eventId, p_event_type: "checkout.session.completed", p_payload: payload,
  });
  check("replayed webhook call succeeds (no-op, not an error)", !secondCallErr, secondCallErr?.message);

  const { data: paymentsAfterReplay } = await admin.from("payments").select("*").eq("order_id", order.id);
  check(
    "still exactly one payment row after replay (idempotency held)",
    paymentsAfterReplay?.length === 1,
    `${paymentsAfterReplay?.length} rows`,
  );

  const { data: stripeEventRows } = await admin.from("stripe_events").select("*").eq("id", eventId);
  check("stripe_events has exactly one row for this event id", stripeEventRows?.length === 1, `${stripeEventRows?.length} rows`);

  await admin.from("payments").delete().eq("order_id", order.id);
  await admin.from("orders").delete().eq("id", order.id);
  await admin.from("stripe_events").delete().eq("id", eventId);
  await admin.auth.admin.deleteUser(user.user.id);
  await admin.from("organizations").delete().eq("id", org.id);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("Script error:", err);
  try {
    await admin.from("payments").delete().in("order_id", created.orderIds);
    await admin.from("orders").delete().in("id", created.orderIds);
    for (const uid of created.userIds) await admin.auth.admin.deleteUser(uid);
    await admin.from("organizations").delete().in("id", created.orgIds);
  } catch {}
  process.exit(1);
});
