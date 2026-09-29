// Regression check for schema_admin_directory.sql: only an active admin can
// read the account directory (emails, last sign-in). Throwaway users,
// cleaned up in finally.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_admin_directory.mjs
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
const userIds = [];

async function makeUser(label, role) {
  const email = `directory-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  userIds.push(data.user.id);
  await admin.from("profiles").update({ role }).eq("id", data.user.id);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, email, client };
}

try {
  const boss = await makeUser("admin", "admin");
  const staff = await makeUser("staff", "internal");
  const client = await makeUser("client", "client");
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: rows, error } = await boss.client.rpc("admin_user_directory");
  const me = rows?.find((r) => r.id === boss.id);
  check("admin sees the directory with emails", !error && me?.email === boss.email, error?.message);
  check("directory includes last sign-in time", !!me?.last_sign_in_at);

  // Every other read the admin "Everything" page makes must work for an admin
  // under real RLS (src/ops/admin/everything/loadEverything.ts).
  const pageReads = {
    organizations: "*", requests: "*", plans: "*", orders: "*", order_items: "*", subscriptions: "*", payments: "*",
    activity_events: "*", client_onboarding: "*", brand_kits: "org_id", deliverables: "id, request_id, created_at",
    contact_submissions: "*", newsletter_signups: "id",
  };
  const failedReads = [];
  for (const [table, cols] of Object.entries(pageReads)) {
    const { error: readErr } = await boss.client.from(table).select(cols).limit(1);
    if (readErr) failedReads.push(`${table}: ${readErr.message}`);
  }
  check("admin can run every read the Everything page makes", failedReads.length === 0, failedReads.join("; "));

  for (const [label, who] of [["staff (non-admin)", staff.client], ["client", client.client], ["signed-out visitor", anon]]) {
    const { data, error: err } = await who.rpc("admin_user_directory");
    check(`${label} can't read it`, !!err && !data?.length, err?.code);
  }

  await admin.from("profiles").update({ is_active: false }).eq("id", boss.id);
  const { error: offErr } = await boss.client.rpc("admin_user_directory");
  check("deactivated admin can't read it", !!offErr, offErr?.code);
} catch (err) {
  check("script ran without throwing", false, err.message);
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
