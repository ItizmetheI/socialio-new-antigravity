// Regression check for deliverable file access (signed URLs on the private
// "deliverables" bucket). Run by hand after any change to storage policies or
// the deliverables table's RLS.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_deliverables_access.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!URL || !SERVICE_KEY || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY env vars");
  process.exit(1);
}

const BUCKET = "deliverables";
const admin = createClient(URL, SERVICE_KEY);
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
}

const stamp = Date.now();
const created = { orgIds: [], userIds: [], requestIds: [], paths: [] };
const password = `Test-${stamp}!Aa1`;

async function makeUser(label, role, orgId) {
  const email = `deliv-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  created.userIds.push(data.user.id);
  await admin.from("profiles").update({ role, org_id: orgId }).eq("id", data.user.id);
  const client = createClient(URL, ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

async function signedFetch(client, path) {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrls([path], 60);
  const url = data?.[0]?.signedUrl;
  if (error || !url) return { ok: false, detail: error?.message ?? data?.[0]?.error ?? "no signed url" };
  const res = await fetch(url);
  return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
}

async function main() {
  const { data: orgA } = await admin.from("organizations").insert({ name: `Deliverables Test A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Deliverables Test B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);

  const staff = await makeUser("staff", "internal", null);
  const clientA = await makeUser("a", "client", orgA.id);
  const clientB = await makeUser("b", "client", orgB.id);

  const { data: request, error: reqErr } = await admin
    .from("requests")
    .insert({ org_id: orgA.id, title: "Deliverable access test", created_by: staff.id })
    .select()
    .single();
  if (reqErr) throw new Error(`request insert failed: ${reqErr.message}`);
  created.requestIds.push(request.id);

  // Staff uploads through the same path convention the UI uses.
  const path = `${orgA.id}/${request.id}/${stamp}-hello.txt`;
  const body = `hello ${stamp}`;
  const { error: upErr } = await staff.client.storage.from(BUCKET).upload(path, new Blob([body], { type: "text/plain" }));
  check("staff: can upload a deliverable file", !upErr, upErr?.message);
  created.paths.push(path);
  const { error: rowErr } = await staff.client
    .from("deliverables")
    .insert({ request_id: request.id, file_path: path, uploaded_by: staff.id });
  check("staff: can record the deliverable row", !rowErr, rowErr?.message);

  const staffFetch = await signedFetch(staff.client, path);
  check("staff: signed URL opens the file", staffFetch.ok && staffFetch.text === body, staffFetch.detail ?? `status ${staffFetch.status}`);

  const { data: rowsA } = await clientA.client.from("deliverables").select("*").eq("request_id", request.id);
  check("client A: sees their deliverable row", rowsA?.length === 1);
  const aFetch = await signedFetch(clientA.client, path);
  check("client A: signed URL opens their own file", aFetch.ok && aFetch.text === body, aFetch.detail ?? `status ${aFetch.status}`);

  const { data: rowsB } = await clientB.client.from("deliverables").select("*").eq("request_id", request.id);
  check("client B: cannot see org A's deliverable row", (rowsB?.length ?? 0) === 0);
  const bFetch = await signedFetch(clientB.client, path);
  check("client B: cannot get a working link to org A's file", !bFetch.ok, bFetch.detail ?? `status ${bFetch.status}`);

  const anon = createClient(URL, ANON_KEY);
  const anonFetch = await signedFetch(anon, path);
  check("signed-out visitor: cannot get a working link", !anonFetch.ok, anonFetch.detail ?? `status ${anonFetch.status}`);
}

async function cleanup() {
  if (created.paths.length) await admin.storage.from(BUCKET).remove(created.paths);
  for (const id of created.requestIds) {
    await admin.from("deliverables").delete().eq("request_id", id);
    await admin.from("requests").delete().eq("id", id);
  }
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
