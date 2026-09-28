// Regression check for schema_security_lock_functions.sql: the Stripe
// payment handlers must be callable only by the server (service_role), never
// through the public API — otherwise anyone could mark their own order paid.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_function_lockdown.mjs
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY env vars");
  process.exit(1);
}

const HANDLERS = [
  "handle_stripe_checkout_completed",
  "handle_stripe_invoice_paid",
  "handle_stripe_subscription_updated",
  "handle_stripe_subscription_deleted",
];
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
};

const stamp = Date.now();
const probeId = `evt_lockdown_probe_${stamp}`;
const email = `lockdown-${stamp}@socialio-internal-test.com`;
const password = `Test-${stamp}!Aa1`;
let userId;

try {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  userId = created.user.id;
  const signedIn = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await signedIn.auth.signInWithPassword({ email, password });

  for (const fn of HANDLERS) {
    const args = { p_event_id: probeId, p_event_type: "probe", p_payload: {} };
    const { error: anonErr } = await anon.rpc(fn, args);
    check(`signed-out visitor can't call ${fn}`, anonErr?.code === "42501", anonErr?.code ?? "no error — it ran!");
    const { error: userErr } = await signedIn.rpc(fn, args);
    check(`signed-in client can't call ${fn}`, userErr?.code === "42501", userErr?.code ?? "no error — it ran!");
  }
  const { data: leaked } = await admin.from("stripe_events").select("id").eq("id", probeId);
  check("no probe event was written", (leaked?.length ?? 0) === 0);
} catch (err) {
  check("script ran without throwing", false, err.message);
} finally {
  await admin.from("stripe_events").delete().eq("id", probeId);
  if (userId) await admin.auth.admin.deleteUser(userId);
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
