// Security regression check for plans/plan_items/plan_feedback — same
// pattern as verify_onboarding_rls.mjs. Run by hand after any change to
// schema_plans.sql.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_plans_rls.mjs
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
const created = { orgIds: [], userIds: [], planIds: [] };

async function main() {
  const { data: orgA } = await admin.from("organizations").insert({ name: `Plans Test A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Plans Test B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);

  const password = `Test-${stamp}!Aa1`;
  const emailA = `plans-test-a-${stamp}@socialio-internal-test.com`;
  const emailB = `plans-test-b-${stamp}@socialio-internal-test.com`;
  const staffEmail = `plans-test-staff-${stamp}@socialio-internal-test.com`;
  const { data: userA } = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
  const { data: userB } = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });
  const { data: staffUser } = await admin.auth.admin.createUser({ email: staffEmail, password, email_confirm: true });
  created.userIds.push(userA.user.id, userB.user.id, staffUser.user.id);
  await admin.from("profiles").update({ role: "client", org_id: orgA.id }).eq("id", userA.user.id);
  await admin.from("profiles").update({ role: "client", org_id: orgB.id }).eq("id", userB.user.id);
  await admin.from("profiles").update({ role: "admin" }).eq("id", staffUser.user.id);

  const clientA = createClient(URL, ANON_KEY);
  await clientA.auth.signInWithPassword({ email: emailA, password });
  const clientB = createClient(URL, ANON_KEY);
  await clientB.auth.signInWithPassword({ email: emailB, password });
  const staffClient = createClient(URL, ANON_KEY);
  await staffClient.auth.signInWithPassword({ email: staffEmail, password });

  // Staff creates + sends a plan for org A with one line item.
  const { data: planA, error: createErr } = await staffClient
    .from("plans")
    .insert({ org_id: orgA.id, created_by: staffUser.user.id, status: "sent", total_price: 279, sent_at: new Date().toISOString() })
    .select()
    .single();
  check("staff: can create + send a plan", !createErr && !!planA, createErr?.message);
  created.planIds.push(planA.id);

  const { data: itemA } = await staffClient
    .from("plan_items")
    .insert({ plan_id: planA.id, service_id: "social-media-posts", deliverable_label: "30 Social Media Posts", quantity: 30, frequency: "monthly", price: 279 })
    .select()
    .single();

  // Client A sees only org A's plan.
  const { data: plansAsA } = await clientA.from("plans").select("*");
  check("client A: sees only org A's plan", plansAsA?.length === 1 && plansAsA[0].id === planA.id, `${plansAsA?.length} rows`);
  const { data: plansAsB } = await clientB.from("plans").select("*").eq("id", planA.id);
  check("client B: cannot read org A's plan", (plansAsB?.length ?? 0) === 0, `${plansAsB?.length} rows`);

  // Client A cannot tamper with plan_items or total_price. A policy-blocked
  // UPDATE returns no error from PostgREST — it just matches zero rows —
  // so verify via a service-role read afterward, not by checking for an
  // error (same lesson as schema_commerce.sql's organizations.status check).
  await clientA.from("plan_items").update({ price: 1 }).eq("id", itemA.id);
  const { data: itemAfterTamper } = await admin.from("plan_items").select("price").eq("id", itemA.id).single();
  check("client A: cannot update plan_items", Number(itemAfterTamper?.price) === 279, `price is now ${itemAfterTamper?.price}`);
  await clientA.from("plans").update({ total_price: 1 }).eq("id", planA.id);
  const { data: planAfterPriceTamper } = await admin.from("plans").select("total_price").eq("id", planA.id).single();
  check("client A: cannot change total_price", Number(planAfterPriceTamper?.total_price) === 279, `now ${planAfterPriceTamper?.total_price}`);

  // Client A views it -> viewed_at stamps.
  const { error: viewErr } = await clientA.from("plans").update({ status: "viewed" }).eq("id", planA.id);
  const { data: afterView } = await admin.from("plans").select("status, viewed_at").eq("id", planA.id).single();
  check("client A: viewing sets viewed_at", !viewErr && afterView?.status === "viewed" && !!afterView?.viewed_at, JSON.stringify(afterView));

  // Client A approves -> responded_at stamps, requests get created.
  const { error: approveErr } = await clientA.from("plans").update({ status: "approved" }).eq("id", planA.id);
  const { data: afterApprove } = await admin.from("plans").select("status, responded_at").eq("id", planA.id).single();
  check("client A: approving sets responded_at", !approveErr && afterApprove?.status === "approved" && !!afterApprove?.responded_at, JSON.stringify(afterApprove));

  const { data: requestsFromPlan } = await admin.from("requests").select("*").eq("plan_item_id", itemA.id);
  check("approving a plan auto-creates its request", requestsFromPlan?.length === 1 && requestsFromPlan[0].title === "30 Social Media Posts", `${requestsFromPlan?.length} rows`);

  // Revision: staff creates a new plan superseding the old one.
  const { data: planA2 } = await staffClient
    .from("plans")
    .insert({ org_id: orgA.id, created_by: staffUser.user.id, status: "draft", version: 2, supersedes_plan_id: planA.id, total_price: 349 })
    .select()
    .single();
  created.planIds.push(planA2.id);
  const { data: planAAfterSupersede } = await admin.from("plans").select("status").eq("id", planA.id).single();
  check("revision auto-supersedes the old plan", planAAfterSupersede?.status === "superseded", `status is ${planAAfterSupersede?.status}`);

  // Feedback: client A can post on their own org's plan; client B cannot.
  const { error: feedbackErr } = await clientA.from("plan_feedback").insert({ plan_id: planA2.id, author_id: userA.user.id, body: "Looks good, one tweak please." });
  check("client A: can post feedback on own org's plan", !feedbackErr, feedbackErr?.message);
  const { error: feedbackBErr } = await clientB.from("plan_feedback").insert({ plan_id: planA2.id, author_id: userB.user.id, body: "sneaky" });
  check("client B: cannot post feedback on org A's plan", !!feedbackBErr, feedbackBErr?.message);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  // cleanup
  await admin.from("plans").delete().in("org_id", [orgA.id, orgB.id]);
  for (const uid of created.userIds) await admin.auth.admin.deleteUser(uid);
  await admin.from("organizations").delete().in("id", created.orgIds);

  if (failed.length > 0) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("Script error:", err);
  try {
    await admin.from("plans").delete().in("org_id", created.orgIds);
    for (const uid of created.userIds) await admin.auth.admin.deleteUser(uid);
    await admin.from("organizations").delete().in("id", created.orgIds);
  } catch {}
  process.exit(1);
});
