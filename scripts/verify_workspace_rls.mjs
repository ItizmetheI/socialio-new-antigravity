// Regression check for schema_workspace.sql: request format/platforms/
// publish_at, brand_kits, performance_reports. Creates throwaway orgs/users
// and cleans up, pass or fail.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_workspace_rls.mjs
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
  const email = `workspace-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  created.userIds.push(data.user.id);
  await admin.from("profiles").update({ role, org_id: orgId }).eq("id", data.user.id);
  const client = createClient(URL, ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

async function main() {
  const { data: orgA } = await admin.from("organizations").insert({ name: `Workspace A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Workspace B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);
  const staff = await makeUser("staff", "internal", null);
  const clientA = await makeUser("a", "client", orgA.id);
  const clientB = await makeUser("b", "client", orgB.id);
  const anon = createClient(URL, ANON_KEY);

  // ---- requests: new columns ----
  const { data: req, error: reqErr } = await clientA.client
    .from("requests")
    .insert({ org_id: orgA.id, created_by: clientA.id, title: "Launch reel", stage: "requested", format: "reel", platforms: ["instagram", "tiktok"] })
    .select()
    .single();
  check("client: can create a request with format + platforms", !reqErr && req?.format === "reel", reqErr?.message);

  const { error: schedInsertErr } = await clientA.client
    .from("requests")
    .insert({ org_id: orgA.id, created_by: clientA.id, title: "Self-scheduled", stage: "requested", publish_at: new Date().toISOString() });
  check("client: cannot create a request with a publish date", !!schedInsertErr);

  const { error: badPlatformErr } = await clientA.client
    .from("requests")
    .insert({ org_id: orgA.id, created_by: clientA.id, title: "Bad", stage: "requested", platforms: ["myspace"] });
  check("unknown platform is rejected", !!badPlatformErr);

  const when = "2026-10-05T15:00:00+00:00";
  const { error: clientSchedErr } = await clientA.client.from("requests").update({ publish_at: when }).eq("id", req.id);
  check("client: cannot set the publish date", !!clientSchedErr);
  const { error: staffSchedErr } = await staff.client.from("requests").update({ publish_at: when }).eq("id", req.id);
  const { data: afterSched } = await admin.from("requests").select("publish_at").eq("id", req.id).single();
  check("staff: can set the publish date", !staffSchedErr && new Date(afterSched.publish_at).getTime() === new Date(when).getTime(), staffSchedErr?.message);
  const { error: clientEditErr } = await clientA.client.from("requests").update({ platforms: ["linkedin"] }).eq("id", req.id);
  check("client: can still edit their brief's platforms", !clientEditErr, clientEditErr?.message);

  // ---- brand kits ----
  const { error: kitErr } = await clientA.client
    .from("brand_kits")
    .insert({ org_id: orgA.id, tagline: "Coffee, faster", colors: [{ label: "Primary", hex: "#1b75bc" }], dos: ["Bold type"], handles: { instagram: "@a" } });
  check("client: can create own brand kit", !kitErr, kitErr?.message);
  const { data: kitRow } = await admin.from("brand_kits").select("updated_by").eq("org_id", orgA.id).single();
  check("brand kit records who saved it", kitRow?.updated_by === clientA.id);
  const { error: otherKitErr } = await clientA.client.from("brand_kits").insert({ org_id: orgB.id, tagline: "hijack" });
  check("client: cannot create another org's brand kit", !!otherKitErr);
  const { data: bSeesA } = await clientB.client.from("brand_kits").select("org_id").eq("org_id", orgA.id);
  check("other client: cannot read someone else's brand kit", (bSeesA?.length ?? 0) === 0);
  const { data: anonKit } = await anon.from("brand_kits").select("org_id").eq("org_id", orgA.id);
  check("signed-out visitor: cannot read brand kits", (anonKit?.length ?? 0) === 0);
  await clientB.client.from("brand_kits").update({ tagline: "hijacked" }).eq("org_id", orgA.id);
  const { data: kitAfter } = await admin.from("brand_kits").select("tagline").eq("org_id", orgA.id).single();
  check("other client: cannot edit someone else's brand kit", kitAfter.tagline === "Coffee, faster");
  const { error: staffKitErr } = await staff.client.from("brand_kits").update({ voice: "Warm and direct" }).eq("org_id", orgA.id);
  const { data: kitStaff } = await admin.from("brand_kits").select("voice").eq("org_id", orgA.id).single();
  check("staff: can edit a client's brand kit", !staffKitErr && kitStaff.voice === "Warm and direct", staffKitErr?.message);
  const { error: moveKitErr } = await clientA.client.from("brand_kits").update({ org_id: orgB.id }).eq("org_id", orgA.id);
  check("client: cannot move their brand kit to another org", !!moveKitErr);

  // ---- performance reports ----
  const report = { org_id: orgA.id, period_month: "2026-09-01", platform: "instagram", followers: 1200, reach: 5400, engagement_rate: 4.2, posts_published: 12 };
  const { error: clientReportErr } = await clientA.client.from("performance_reports").insert(report);
  check("client: cannot write their own results", !!clientReportErr);
  const { data: staffReport, error: staffReportErr } = await staff.client.from("performance_reports").insert(report).select().single();
  check("staff: can record monthly results", !staffReportErr && !!staffReport, staffReportErr?.message);
  const { data: aReports } = await clientA.client.from("performance_reports").select("id").eq("org_id", orgA.id);
  check("client: can read own results", aReports?.length === 1);
  const { data: bReports } = await clientB.client.from("performance_reports").select("id").eq("org_id", orgA.id);
  check("other client: cannot read someone else's results", (bReports?.length ?? 0) === 0);
  await clientA.client.from("performance_reports").update({ followers: 999999 }).eq("id", staffReport.id);
  const { data: repAfter } = await admin.from("performance_reports").select("followers").eq("id", staffReport.id).single();
  check("client: cannot edit their results", repAfter.followers === 1200);
  const { error: dupErr } = await staff.client.from("performance_reports").insert(report);
  check("one row per client, month and platform", !!dupErr);
  const { error: midMonthErr } = await staff.client.from("performance_reports").insert({ ...report, period_month: "2026-09-15", platform: "tiktok" });
  check("month must be the 1st (period_month)", !!midMonthErr);
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
