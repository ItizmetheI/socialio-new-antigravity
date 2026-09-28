// Regression check for schema_security_audit.sql. Creates throwaway users,
// orgs, uploads and submissions; cleans up in finally.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_security_audit.mjs
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY env vars");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
};

const stamp = Date.now();
const password = `Test-${stamp}!Aa1`;
const created = { userIds: [], orgIds: [], paths: [], emails: [] };

async function makeUser(label, role, orgId) {
  const email = `audit-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  created.userIds.push(data.user.id);
  await admin.from("profiles").update({ role, org_id: orgId }).eq("id", data.user.id);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

try {
  const { data: org } = await admin.from("organizations").insert({ name: `Audit ${stamp}` }).select().single();
  created.orgIds.push(org.id);
  const staff = await makeUser("staff", "internal", null);
  const client = await makeUser("client", "client", org.id);

  // 1. Deactivation actually removes access.
  const { data: before } = await staff.client.from("organizations").select("id").eq("id", org.id);
  check("active staff can read client orgs", before?.length === 1);
  await admin.from("profiles").update({ is_active: false }).eq("id", staff.id);
  const { data: after } = await staff.client.from("organizations").select("id").eq("id", org.id);
  check("deactivated staff lose access immediately", (after?.length ?? 0) === 0);
  const { data: clientBefore } = await client.client.from("organizations").select("id").eq("id", org.id);
  check("active client can read own org", clientBefore?.length === 1);
  await admin.from("profiles").update({ is_active: false }).eq("id", client.id);
  const { data: clientAfter } = await client.client.from("organizations").select("id").eq("id", org.id);
  check("deactivated client loses access immediately", (clientAfter?.length ?? 0) === 0);
  await admin.from("profiles").update({ is_active: true }).eq("id", client.id);

  // 2. Upload limits (checked with the service key; limits apply to everyone).
  const bucket = admin.storage.from("deliverables");
  const okPath = `${org.id}/onboarding/${stamp}-logo.png`;
  const { error: okErr } = await bucket.upload(okPath, new Blob([new Uint8Array(1024)], { type: "image/png" }));
  if (!okErr) created.paths.push(okPath);
  check("normal image upload still works", !okErr, okErr?.message);
  const htmlPath = `${org.id}/onboarding/${stamp}-page.html`;
  const { error: htmlErr } = await bucket.upload(htmlPath, new Blob(["<script>alert(1)</script>"], { type: "text/html" }));
  if (!htmlErr) created.paths.push(htmlPath);
  check("HTML upload is refused (file type not allowed)", !!htmlErr, htmlErr?.message);
  const bigPath = `${org.id}/onboarding/${stamp}-big.mp4`;
  const { error: bigErr } = await bucket.upload(bigPath, new Blob([new Uint8Array(51 * 1024 * 1024)], { type: "video/mp4" }));
  if (!bigErr) created.paths.push(bigPath);
  check("file over 50 MB is refused", !!bigErr, bigErr?.message);

  // 3. Contact form flood protection (as a signed-out visitor).
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const email = `audit-flood-${stamp}@example.org`;
  created.emails.push(email);
  const statuses = [];
  for (let i = 0; i < 4; i++) {
    const { error } = await anon.from("contact_submissions").insert({ name: "Flood Test", email, message: `msg ${i}` });
    statuses.push(error ? "blocked" : "ok");
  }
  check("4th message from the same email within an hour is blocked", statuses.join(",") === "ok,ok,ok,blocked", statuses.join(","));

  // 4. Trigger functions not callable.
  const { error: rpcErr } = await anon.rpc("throttle_public_inserts");
  check("helper trigger function can't be called directly", !!rpcErr, rpcErr?.code);
} catch (err) {
  check("script ran without throwing", false, err.message);
} finally {
  if (created.paths.length) await admin.storage.from("deliverables").remove(created.paths);
  for (const email of created.emails) await admin.from("contact_submissions").delete().eq("email", email);
  for (const id of created.orgIds) await admin.from("organizations").delete().eq("id", id);
  for (const id of created.userIds) await admin.auth.admin.deleteUser(id);
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
