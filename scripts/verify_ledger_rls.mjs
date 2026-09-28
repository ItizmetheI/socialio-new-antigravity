// Regression check for schema_ledger.sql: requests.order_item_id / units and
// the order ledger's read path. Creates throwaway orgs/users and cleans up,
// pass or fail.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_ledger_rls.mjs
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
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
}

const stamp = Date.now();
const created = { orgIds: [], userIds: [] };
const password = `Test-${stamp}!Aa1`;

async function makeUser(label, role, orgId) {
  const email = `ledger-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  created.userIds.push(data.user.id);
  await admin.from("profiles").update({ role, org_id: orgId }).eq("id", data.user.id);
  const client = createClient(URL, ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

async function seedOrder(orgId, createdBy) {
  const { data: order, error } = await admin
    .from("orders")
    .insert({ org_id: orgId, created_by: createdBy, status: "paid", amount_subtotal: 7900, amount_total: 7900, paid_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(`seed order: ${error.message}`);
  const { data: item, error: itemErr } = await admin
    .from("order_items")
    .insert({ order_id: order.id, service_id: "social-media-posts", tier_label: "10 Posts", item_type: "service", billing_interval: "month", unit_amount: 7900, units: 10 })
    .select()
    .single();
  if (itemErr) throw new Error(`seed order item: ${itemErr.message}`);
  return item;
}

async function main() {
  const { data: orgA } = await admin.from("organizations").insert({ name: `Ledger A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Ledger B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);
  const staff = await makeUser("staff", "internal", null);
  const clientA = await makeUser("a", "client", orgA.id);
  const clientB = await makeUser("b", "client", orgB.id);
  const anon = createClient(URL, ANON_KEY);
  const itemA = await seedOrder(orgA.id, clientA.id);
  const itemB = await seedOrder(orgB.id, clientB.id);

  const base = { org_id: orgA.id, created_by: clientA.id, stage: "requested" };

  // ---- linking a request to an order line ----
  const { data: req, error: reqErr } = await clientA.client
    .from("requests")
    .insert({ ...base, title: "Counts toward my posts", order_item_id: itemA.id })
    .select()
    .single();
  check("client: can link a new request to own order line", !reqErr && req?.order_item_id === itemA.id && req?.units === 1, reqErr?.message);

  const { error: crossInsertErr } = await clientA.client.from("requests").insert({ ...base, title: "Steal B's balance", order_item_id: itemB.id });
  check("client: cannot link a new request to another org's order line", !!crossInsertErr);

  const { error: crossUpdateErr } = await clientA.client.from("requests").update({ order_item_id: itemB.id }).eq("id", req.id);
  const { data: afterCross } = await admin.from("requests").select("order_item_id").eq("id", req.id).single();
  check("client: cannot re-point a request at another org's order line", !!crossUpdateErr && afterCross.order_item_id === itemA.id);

  const { error: staffCrossErr } = await staff.client.from("requests").update({ order_item_id: itemB.id }).eq("id", req.id);
  check("staff: cannot link a request to a different org's order line either", !!staffCrossErr);

  const { error: bogusErr } = await clientA.client.from("requests").insert({ ...base, title: "Made-up line", order_item_id: crypto.randomUUID() });
  check("client: made-up order line id is rejected", !!bogusErr);

  // ---- units are staff-only ----
  const { error: unitsInsertErr } = await clientA.client.from("requests").insert({ ...base, title: "Cheap", units: 5 });
  check("client: cannot create a request with custom units", !!unitsInsertErr);

  const { error: unitsUpdateErr } = await clientA.client.from("requests").update({ units: 3 }).eq("id", req.id);
  const { data: afterUnits } = await admin.from("requests").select("units").eq("id", req.id).single();
  check("client: cannot change units", !!unitsUpdateErr && afterUnits.units === 1);

  const { error: staffUnitsErr } = await staff.client.from("requests").update({ units: 4 }).eq("id", req.id);
  const { data: afterStaffUnits } = await admin.from("requests").select("units").eq("id", req.id).single();
  check("staff: can set units", !staffUnitsErr && afterStaffUnits.units === 4, staffUnitsErr?.message);

  const { error: tooManyErr } = await staff.client.from("requests").update({ units: 101 }).eq("id", req.id);
  check("units capped at 100", !!tooManyErr);

  // ---- once work starts, the client can't unlink it to refund balance ----
  const { error: unlinkEarlyErr } = await clientA.client.from("requests").update({ order_item_id: null }).eq("id", req.id);
  check("client: can change the line while still 'requested'", !unlinkEarlyErr, unlinkEarlyErr?.message);
  await staff.client.from("requests").update({ order_item_id: itemA.id, stage: "in_progress" }).eq("id", req.id);
  const { error: unlinkLateErr } = await clientA.client.from("requests").update({ order_item_id: null }).eq("id", req.id);
  const { data: afterUnlink } = await admin.from("requests").select("order_item_id").eq("id", req.id).single();
  check("client: cannot unlink a request once work has started", !!unlinkLateErr && afterUnlink.order_item_id === itemA.id);

  // ---- reading the ledger (order lines + the requests that draw them down) ----
  const { data: aItems } = await clientA.client.from("order_items").select("id, units").eq("id", itemA.id);
  const { data: aReqs } = await clientA.client.from("requests").select("id, units").eq("order_item_id", itemA.id);
  check("client: can read own ledger", aItems?.length === 1 && aItems[0].units === 10 && aReqs?.length === 1 && aReqs[0].units === 4);

  const { data: aSeesB } = await clientA.client.from("order_items").select("id").eq("id", itemB.id);
  const { data: bSeesA } = await clientB.client.from("requests").select("id").eq("order_item_id", itemA.id);
  check("client: cannot read another org's ledger", (aSeesB?.length ?? 0) === 0 && (bSeesA?.length ?? 0) === 0);

  const { data: anonItems } = await anon.from("order_items").select("id").in("id", [itemA.id, itemB.id]);
  check("signed-out visitor: cannot read any ledger", (anonItems?.length ?? 0) === 0);

  const { data: staffItems } = await staff.client.from("order_items").select("id").in("id", [itemA.id, itemB.id]);
  const { data: staffReqs } = await staff.client.from("requests").select("id").eq("order_item_id", itemA.id);
  check("staff: can read every client's ledger", staffItems?.length === 2 && staffReqs?.length === 1);
}

try {
  await main();
} catch (err) {
  check("script ran without throwing", false, err.message);
} finally {
  for (const orgId of created.orgIds) await admin.from("organizations").delete().eq("id", orgId);
  for (const userId of created.userIds) await admin.auth.admin.deleteUser(userId);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
