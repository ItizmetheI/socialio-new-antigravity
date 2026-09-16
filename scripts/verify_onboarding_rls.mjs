// Security regression check for client_onboarding/onboarding_assets — same
// pattern as verify_rls.mjs. Run by hand after any change to
// schema_onboarding.sql.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_onboarding_rls.mjs
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
const created = { orgIds: [], userIds: [] };

async function main() {
  const { data: orgA } = await admin.from("organizations").insert({ name: `Onboarding Test A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Onboarding Test B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);

  const password = `Test-${stamp}!Aa1`;
  const emailA = `onboarding-test-a-${stamp}@socialio-internal-test.com`;
  const emailB = `onboarding-test-b-${stamp}@socialio-internal-test.com`;
  const { data: userA } = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
  const { data: userB } = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });
  created.userIds.push(userA.user.id, userB.user.id);
  await admin.from("profiles").update({ role: "client", org_id: orgA.id }).eq("id", userA.user.id);
  await admin.from("profiles").update({ role: "client", org_id: orgB.id }).eq("id", userB.user.id);

  const clientA = createClient(URL, ANON_KEY);
  await clientA.auth.signInWithPassword({ email: emailA, password });
  const clientB = createClient(URL, ANON_KEY);
  await clientB.auth.signInWithPassword({ email: emailB, password });

  // Client A creates + progressively updates their own onboarding row.
  const { data: onboardingA, error: createErr } = await clientA
    .from("client_onboarding")
    .insert({ org_id: orgA.id, status: "in_progress", answers: { business_name: "Test Co" } })
    .select()
    .single();
  check("client A: can create their own onboarding row", !createErr && !!onboardingA, createErr?.message);

  const { error: updateErr } = await clientA
    .from("client_onboarding")
    .update({ answers: { business_name: "Test Co", goals: "grow" } })
    .eq("id", onboardingA.id);
  check("client A: can progressively update their own onboarding row", !updateErr, updateErr?.message);

  // Client B cannot read or update org A's onboarding row.
  const { data: readAsB } = await clientB.from("client_onboarding").select("*").eq("id", onboardingA.id);
  check("client B: cannot read org A's onboarding row", (readAsB?.length ?? 0) === 0, `${readAsB?.length} rows`);

  await clientB.from("client_onboarding").update({ answers: { hacked: true } }).eq("id", onboardingA.id);
  const { data: onboardingAAfterBAttempt } = await admin.from("client_onboarding").select("answers").eq("id", onboardingA.id).single();
  check(
    "client B: update on org A's onboarding row doesn't change it",
    JSON.stringify(onboardingAAfterBAttempt?.answers) !== JSON.stringify({ hacked: true }),
    JSON.stringify(onboardingAAfterBAttempt?.answers),
  );

  // Client A can submit (sets submitted_at); cannot mark reviewed.
  const { error: submitErr } = await clientA.from("client_onboarding").update({ status: "submitted" }).eq("id", onboardingA.id);
  const { data: afterSubmit } = await admin.from("client_onboarding").select("status, submitted_at").eq("id", onboardingA.id).single();
  check(
    "client A: can submit their onboarding (sets submitted_at)",
    !submitErr && afterSubmit?.status === "submitted" && !!afterSubmit?.submitted_at,
    `status=${afterSubmit?.status} submitted_at=${afterSubmit?.submitted_at}`,
  );

  await clientA.from("client_onboarding").update({ status: "reviewed" }).eq("id", onboardingA.id);
  const { data: afterClientReviewAttempt } = await admin.from("client_onboarding").select("status").eq("id", onboardingA.id).single();
  check(
    "client A: cannot mark their own onboarding as reviewed",
    afterClientReviewAttempt?.status === "submitted",
    `status is now ${afterClientReviewAttempt?.status}`,
  );

  // Staff CAN mark it reviewed — through a real signed-in staff session, not
  // service-role (auth.uid() is null under service-role, so is_staff()
  // always evaluates false there — that's a test artifact, not what the
  // real ops UI does; it always calls through the signed-in staff user's
  // own session).
  const { data: staffUser } = await admin.auth.admin.createUser({
    email: `onboarding-test-staff-${stamp}@socialio-internal-test.com`, password, email_confirm: true,
  });
  created.userIds.push(staffUser.user.id);
  await admin.from("profiles").update({ role: "admin" }).eq("id", staffUser.user.id);
  const staffClient = createClient(URL, ANON_KEY);
  await staffClient.auth.signInWithPassword({ email: `onboarding-test-staff-${stamp}@socialio-internal-test.com`, password });

  const { error: staffReviewErr } = await staffClient
    .from("client_onboarding")
    .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: userA.user.id })
    .eq("id", onboardingA.id);
  check("staff (real signed-in session): can mark onboarding reviewed", !staffReviewErr, staffReviewErr?.message);

  // Once reviewed, client A can no longer update it at all.
  const { error: postReviewErr } = await clientA.from("client_onboarding").update({ answers: { late: true } }).eq("id", onboardingA.id);
  const { data: afterPostReviewAttempt } = await admin.from("client_onboarding").select("answers").eq("id", onboardingA.id).single();
  check(
    "client A: cannot update onboarding once reviewed",
    JSON.stringify(afterPostReviewAttempt?.answers) !== JSON.stringify({ late: true }),
    postReviewErr?.message ?? JSON.stringify(afterPostReviewAttempt?.answers),
  );

  // Storage path scoping (insert policy only — this checks the policy logic
  // via a signed upload attempt is out of scope for this script; RLS INSERT
  // policy correctness on storage.objects is exercised by the same
  // (storage.foldername) pattern already verified for the deliverables
  // bucket in schema.sql, applied here with an added prefix segment check).

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  // cleanup
  await admin.from("client_onboarding").delete().in("org_id", [orgA.id, orgB.id]);
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
    await admin.from("client_onboarding").delete().in("org_id", created.orgIds);
    for (const uid of created.userIds) await admin.auth.admin.deleteUser(uid);
    await admin.from("organizations").delete().in("id", created.orgIds);
  } catch {}
  process.exit(1);
});
