// Security regression check — run by hand against the live project after
// any RLS/schema change, not part of the app and not wired into CI. Creates
// two throwaway orgs + client users, seeds one order/payment row per org
// directly (bypassing checkout), signs in as each client via the real anon
// key, and checks the manual verification checklists in schema.sql /
// schema_commerce.sql. Cleans up everything it created at the end, pass or
// fail.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_rls.mjs
//
// SUPABASE_SERVICE_KEY is the service-role/secret key — never commit it,
// pass it as an env var each time.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!URL || !SERVICE_KEY || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY env vars");
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
  // ---- Setup ----------------------------------------------------------
  const { data: orgA } = await admin.from("organizations").insert({ name: `RLS Test Org A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `RLS Test Org B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);

  const password = `Test-${stamp}!Aa1`;
  const emailA = `rls-test-a-${stamp}@socialio-internal-test.com`;
  const emailB = `rls-test-b-${stamp}@socialio-internal-test.com`;

  // NOTE: GoTrue applies admin-supplied app_metadata to auth.users in a step
  // AFTER the initial row insert, so trg_handle_new_user's AFTER INSERT read
  // of raw_app_meta_data never sees it (see diagnose_rls.mjs). invite-client
  // now does an explicit follow-up profiles UPDATE for exactly this reason —
  // mirror that here so this script tests real provisioning behavior, not
  // the trigger's (currently unreachable) app_metadata path.
  const { data: userA } = await admin.auth.admin.createUser({
    email: emailA, password, email_confirm: true,
    app_metadata: { role: "client", org_id: orgA.id },
  });
  const { data: userB } = await admin.auth.admin.createUser({
    email: emailB, password, email_confirm: true,
    app_metadata: { role: "client", org_id: orgB.id },
  });
  created.userIds.push(userA.user.id, userB.user.id);
  await admin.from("profiles").update({ role: "client", org_id: orgA.id }).eq("id", userA.user.id);
  await admin.from("profiles").update({ role: "client", org_id: orgB.id }).eq("id", userB.user.id);

  // one paid order + payment per org, inserted directly (service-role,
  // bypasses RLS) so there's real cross-org data to try to leak
  for (const [org, user] of [[orgA, userA], [orgB, userB]]) {
    const { data: order } = await admin
      .from("orders")
      .insert({
        org_id: org.id, created_by: user.user.id, status: "paid",
        amount_subtotal: 7900, amount_total: 7900,
        stripe_checkout_session_id: `cs_test_${org.id}`,
      })
      .select()
      .single();
    created.orderIds.push(order.id);
    await admin.from("payments").insert({
      org_id: org.id, order_id: order.id, status: "succeeded",
      amount: 7900, stripe_payment_intent_id: `pi_test_${org.id}`,
    });
  }

  // ---- Anon (no session) ------------------------------------------------
  const anon = createClient(URL, ANON_KEY);
  const { data: anonOrgs } = await anon.from("organizations").select("*");
  check("anon: select organizations returns nothing", (anonOrgs?.length ?? 0) === 0, `${anonOrgs?.length} rows`);
  const { data: anonOrders } = await anon.from("orders").select("*");
  check("anon: select orders returns nothing", (anonOrders?.length ?? 0) === 0, `${anonOrders?.length} rows`);

  // ---- Client A signed in ----------------------------------------------
  const clientA = createClient(URL, ANON_KEY);
  const { error: signInErrA } = await clientA.auth.signInWithPassword({ email: emailA, password });
  check("client A: sign-in succeeds", !signInErrA, signInErrA?.message);

  const { data: orgsAsA } = await clientA.from("organizations").select("*");
  check(
    "client A: select organizations returns only org A",
    orgsAsA?.length === 1 && orgsAsA[0].id === orgA.id,
    `${orgsAsA?.length} rows`,
  );

  const { data: ordersAsA } = await clientA.from("orders").select("*");
  check(
    "client A: select orders returns only org A's order",
    ordersAsA?.length === 1 && ordersAsA[0].org_id === orgA.id,
    `${ordersAsA?.length} rows`,
  );

  const { data: paymentsAsA } = await clientA.from("payments").select("*");
  check(
    "client A: select payments returns only org A's payment",
    paymentsAsA?.length === 1 && paymentsAsA[0].org_id === orgA.id,
    `${paymentsAsA?.length} rows`,
  );

  // direct ID guess at org B's order — should still come back empty
  const { data: guessedOrderB } = await clientA.from("orders").select("*").eq("org_id", orgB.id);
  check("client A: guessing org B's org_id on orders returns nothing", (guessedOrderB?.length ?? 0) === 0);

  const { data: stripeEventsAsA } = await clientA.from("stripe_events").select("*");
  check("client A: select stripe_events returns nothing (no grant at all)", (stripeEventsAsA?.length ?? 0) === 0);

  const { error: updateOrderErr } = await clientA
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", created.orderIds[0]);
  check("client A: UPDATE on own org's order is rejected", !!updateOrderErr, updateOrderErr?.message);

  // A policy-blocked UPDATE returns no error from PostgREST — it just
  // matches zero rows. Verify via a service-role read afterward that the
  // status genuinely didn't change, rather than checking for an error.
  await clientA.from("organizations").update({ status: "active" }).eq("id", orgA.id);
  const { data: orgAAfter } = await admin.from("organizations").select("status").eq("id", orgA.id).single();
  check(
    "client A: UPDATE organizations.status doesn't actually change it (service-role only)",
    orgAAfter?.status === "prospect",
    `status is now ${orgAAfter?.status}`,
  );

  // ---- Client B signed in — confirm the mirror image -------------------
  const clientB = createClient(URL, ANON_KEY);
  await clientB.auth.signInWithPassword({ email: emailB, password });
  const { data: ordersAsB } = await clientB.from("orders").select("*");
  check(
    "client B: select orders returns only org B's order",
    ordersAsB?.length === 1 && ordersAsB[0].org_id === orgB.id,
    `${ordersAsB?.length} rows`,
  );

  // ---- Original dashboard tables (proposals/requests/comments) ---------
  // Never actually verified against a live project before now — only the
  // admin happy path was smoke-tested during the original dashboard build.
  // All rows here cascade-delete when the test orgs are removed at the end
  // (every FK chain in schema.sql traces back to organizations ON DELETE
  // CASCADE), so no separate cleanup is needed.
  const { data: propA } = await admin
    .from("proposals")
    .insert({ org_id: orgA.id, created_by: userA.user.id, status: "pending", total_price: 199 })
    .select()
    .single();
  await admin.from("proposal_items").insert({
    proposal_id: propA.id, service_id: "social-media-posts", tier_label: "10 Posts", price: 199,
  });
  const { data: propB } = await admin
    .from("proposals")
    .insert({ org_id: orgB.id, created_by: userB.user.id, status: "pending", total_price: 99 })
    .select()
    .single();

  const { data: reqA } = await admin
    .from("requests")
    .insert({ org_id: orgA.id, title: "Test request A", created_by: userA.user.id })
    .select()
    .single();
  await admin.from("comments").insert({
    request_id: reqA.id, author_id: userA.user.id, body: "internal note", visibility: "internal",
  });

  const { data: proposalsAsA } = await clientA.from("proposals").select("*");
  check(
    "client A: select proposals returns only org A's",
    proposalsAsA?.length === 1 && proposalsAsA[0].id === propA.id,
    `${proposalsAsA?.length} rows`,
  );
  const { data: guessedPropB } = await clientA.from("proposals").select("*").eq("id", propB.id);
  check("client A: guessing org B's proposal id returns nothing", (guessedPropB?.length ?? 0) === 0);

  const { error: totalPriceErr } = await clientA.from("proposals").update({ total_price: 1 }).eq("id", propA.id);
  const { data: propAAfterPriceAttempt } = await admin.from("proposals").select("total_price").eq("id", propA.id).single();
  check(
    "client A: cannot change proposals.total_price",
    propAAfterPriceAttempt?.total_price === 199,
    totalPriceErr ? totalPriceErr.message : `total_price is now ${propAAfterPriceAttempt?.total_price}`,
  );

  const { data: requestsAsA } = await clientA.from("requests").select("*");
  check(
    "client A: select requests returns only org A's",
    requestsAsA?.some((r) => r.id === reqA.id) && requestsAsA.every((r) => r.org_id === orgA.id),
    `${requestsAsA?.length} rows`,
  );

  // Clients CAN flip their own pending proposal to approved — and that
  // transition should auto-create a matching request from proposal_items
  // (trg_2_create_requests_from_proposal).
  const { error: approveErr } = await clientA.from("proposals").update({ status: "approved" }).eq("id", propA.id);
  const { data: propAAfterApprove } = await admin.from("proposals").select("status").eq("id", propA.id).single();
  check(
    "client A: can approve their own pending proposal",
    !approveErr && propAAfterApprove?.status === "approved",
    approveErr?.message ?? `status is now ${propAAfterApprove?.status}`,
  );
  const { data: autoCreatedRequests } = await admin
    .from("requests")
    .select("*")
    .eq("proposal_item_id", (await admin.from("proposal_items").select("id").eq("proposal_id", propA.id).single()).data?.id);
  check(
    "client A approving a proposal auto-creates its request",
    (autoCreatedRequests?.length ?? 0) === 1,
    `${autoCreatedRequests?.length} rows`,
  );

  await clientA.from("requests").update({ stage: "delivered" }).eq("id", reqA.id);
  const { data: reqAAfter } = await admin.from("requests").select("stage").eq("id", reqA.id).single();
  check(
    "client A: cannot change requests.stage",
    reqAAfter?.stage === "requested",
    `stage is now ${reqAAfter?.stage}`,
  );

  const { error: badInsertErr } = await clientA.from("requests").insert({
    org_id: orgA.id, title: "Sneaky request", created_by: userA.user.id, stage: "delivered",
  });
  check("client A: cannot INSERT a request with stage='delivered'", !!badInsertErr, badInsertErr?.message);

  const { data: commentsAsA } = await clientA.from("comments").select("*").eq("request_id", reqA.id);
  check(
    "client A: cannot read internal-visibility comments on their own request",
    (commentsAsA?.length ?? 0) === 0,
    `${commentsAsA?.length} rows`,
  );

  await clientA.from("profiles").update({ role: "admin" }).eq("id", userA.user.id);
  const { data: profileAAfter } = await admin.from("profiles").select("role").eq("id", userA.user.id).single();
  check(
    "client A: cannot self-escalate profiles.role to admin",
    profileAAfter?.role === "client",
    `role is now ${profileAAfter?.role}`,
  );

  // ---- Cleanup -----------------------------------------------------------
  await admin.from("payments").delete().in("order_id", created.orderIds);
  await admin.from("orders").delete().in("id", created.orderIds);
  for (const uid of created.userIds) await admin.auth.admin.deleteUser(uid);
  await admin.from("organizations").delete().in("id", created.orgIds);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("Script error:", err);
  // best-effort cleanup even on failure
  try {
    await admin.from("payments").delete().in("order_id", created.orderIds);
    await admin.from("orders").delete().in("id", created.orderIds);
    for (const uid of created.userIds) await admin.auth.admin.deleteUser(uid);
    await admin.from("organizations").delete().in("id", created.orgIds);
  } catch {}
  process.exit(1);
});
