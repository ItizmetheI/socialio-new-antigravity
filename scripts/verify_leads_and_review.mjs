// Regression check for schema_leads_read.sql (staff-only lead inbox) and
// schema_client_review.sql (client review transitions + request submission).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_leads_and_review.mjs
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
const created = { orgIds: [], userIds: [], leadIds: [], signupIds: [], requestIds: [] };
const password = `Test-${stamp}!Aa1`;

async function makeUser(label, role, orgId) {
  const email = `leads-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  created.userIds.push(data.user.id);
  await admin.from("profiles").update({ role, org_id: orgId }).eq("id", data.user.id);
  const client = createClient(URL, ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

async function stageOf(id) {
  const { data } = await admin.from("requests").select("stage, assigned_to").eq("id", id).single();
  return data;
}

async function main() {
  const { data: org } = await admin.from("organizations").insert({ name: `Leads Test ${stamp}` }).select().single();
  created.orgIds.push(org.id);
  const staff = await makeUser("staff", "internal", null);
  const client = await makeUser("client", "client", org.id);
  const anon = createClient(URL, ANON_KEY);

  // ---- Leads ----
  const { data: lead } = await admin
    .from("contact_submissions")
    .insert({ name: `Lead ${stamp}`, email: `lead-${stamp}@example.org`, message: "test" })
    .select()
    .single();
  created.leadIds.push(lead.id);
  const { data: signup } = await admin.from("newsletter_signups").insert({ email: `news-${stamp}@example.org` }).select().single();
  created.signupIds.push(signup.id);

  const { data: staffLeads } = await staff.client.from("contact_submissions").select("id").eq("id", lead.id);
  check("staff: can read contact submissions", staffLeads?.length === 1);
  const { data: staffSignups } = await staff.client.from("newsletter_signups").select("id").eq("id", signup.id);
  check("staff: can read newsletter signups", staffSignups?.length === 1);

  const { data: clientLeads } = await client.client.from("contact_submissions").select("id").eq("id", lead.id);
  check("client: cannot read contact submissions", (clientLeads?.length ?? 0) === 0);
  const { data: clientSignups } = await client.client.from("newsletter_signups").select("id").eq("id", signup.id);
  check("client: cannot read newsletter signups", (clientSignups?.length ?? 0) === 0);
  const { data: anonLeads } = await anon.from("contact_submissions").select("id").eq("id", lead.id);
  check("signed-out visitor: cannot read contact submissions", (anonLeads?.length ?? 0) === 0);

  const { error: staffStatusErr } = await staff.client.from("contact_submissions").update({ status: "contacted" }).eq("id", lead.id);
  const { data: afterStaff } = await admin.from("contact_submissions").select("status").eq("id", lead.id).single();
  check("staff: can move a lead's status", !staffStatusErr && afterStaff.status === "contacted", staffStatusErr?.message);
  await client.client.from("contact_submissions").update({ status: "closed" }).eq("id", lead.id);
  const { data: afterClient } = await admin.from("contact_submissions").select("status").eq("id", lead.id).single();
  check("client: cannot change a lead's status", afterClient.status === "contacted");
  const { error: staffMsgErr } = await staff.client.from("contact_submissions").update({ message: "edited" }).eq("id", lead.id);
  check("staff: cannot edit a lead's message (status column only)", !!staffMsgErr);

  // ---- Client request submission ----
  const { data: submitted, error: submitErr } = await client.client
    .from("requests")
    .insert({ org_id: org.id, title: "Client-submitted", created_by: client.id, stage: "requested" })
    .select()
    .single();
  check("client: can submit a new request", !submitErr && !!submitted, submitErr?.message);
  if (submitted) created.requestIds.push(submitted.id);
  const { error: skipErr } = await client.client
    .from("requests")
    .insert({ org_id: org.id, title: "Skip ahead", created_by: client.id, stage: "in_progress" });
  check("client: cannot submit a request already in progress", !!skipErr);

  // ---- Client review transitions ----
  const { data: inReview } = await admin
    .from("requests")
    .insert({ org_id: org.id, title: "Review me", created_by: staff.id, stage: "review" })
    .select()
    .single();
  created.requestIds.push(inReview.id);

  const { error: sendBackErr } = await client.client.from("requests").update({ stage: "in_progress" }).eq("id", inReview.id);
  check("client: can send work in review back for changes", !sendBackErr && (await stageOf(inReview.id)).stage === "in_progress", sendBackErr?.message);

  const { error: jumpErr } = await client.client.from("requests").update({ stage: "delivered" }).eq("id", inReview.id);
  check("client: cannot mark in-progress work delivered", !!jumpErr && (await stageOf(inReview.id)).stage === "in_progress");

  const { error: resetErr } = await staff.client.from("requests").update({ stage: "review" }).eq("id", inReview.id);
  check("staff: can move work back into review", !resetErr && (await stageOf(inReview.id)).stage === "review", resetErr?.message);
  const { error: approveErr } = await client.client.from("requests").update({ stage: "delivered" }).eq("id", inReview.id);
  check("client: can approve work in review", !approveErr && (await stageOf(inReview.id)).stage === "delivered", approveErr?.message);

  const { error: assignErr } = await client.client.from("requests").update({ assigned_to: client.id }).eq("id", submitted.id);
  check("client: cannot assign a request", !!assignErr && (await stageOf(submitted.id)).assigned_to === null);

  const { error: staffAssignErr } = await staff.client.from("requests").update({ assigned_to: staff.id }).eq("id", submitted.id);
  check("staff: can assign a request", !staffAssignErr && (await stageOf(submitted.id)).assigned_to === staff.id, staffAssignErr?.message);
}

async function cleanup() {
  for (const id of created.requestIds) await admin.from("requests").delete().eq("id", id);
  for (const id of created.leadIds) await admin.from("contact_submissions").delete().eq("id", id);
  for (const id of created.signupIds) await admin.from("newsletter_signups").delete().eq("id", id);
  for (const id of created.userIds) await admin.auth.admin.deleteUser(id);
  for (const id of created.orgIds) await admin.from("organizations").delete().eq("id", id);
}

main()
  .catch((err) => {
    console.error("Script error:", err.message);
    results.push({ name: "script ran", ok: false });
  })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
  });
