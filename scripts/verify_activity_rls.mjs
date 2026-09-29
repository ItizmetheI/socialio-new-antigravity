// Regression check for schema_activity.sql: the activity feed is written only
// by triggers, clients see their own org minus internal notes, and live
// updates (Realtime) deliver changes to the right people only.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     node scripts/verify_activity_rls.mjs
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const stamp = Date.now();
const password = `Test-${stamp}!Aa1`;
const created = { userIds: [], orgIds: [] };
const channels = [];

async function makeUser(label, role, orgId) {
  const email = `activity-${label}-${stamp}@socialio-internal-test.com`;
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  created.userIds.push(data.user.id);
  await admin.from("profiles").update({ role, org_id: orgId }).eq("id", data.user.id);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

try {
  const { data: orgA } = await admin.from("organizations").insert({ name: `Activity A ${stamp}` }).select().single();
  const { data: orgB } = await admin.from("organizations").insert({ name: `Activity B ${stamp}` }).select().single();
  created.orgIds.push(orgA.id, orgB.id);
  const staff = await makeUser("staff", "internal", null);
  const clientA = await makeUser("a", "client", orgA.id);
  const clientB = await makeUser("b", "client", orgB.id);

  // Live: client A listens to their requests; client B listens too (must hear nothing about A).
  const heardByA = [];
  const heardByB = [];
  for (const [who, sink] of [[clientA, heardByA], [clientB, heardByB]]) {
    await who.client.realtime.setAuth((await who.client.auth.getSession()).data.session.access_token);
    const ch = who.client
      .channel(`verify-${stamp}-${sink === heardByA ? "a" : "b"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_events" }, (p) => sink.push(p.new))
      .subscribe();
    channels.push([who.client, ch]);
  }
  // Same subscription the pipeline/overview pages use (useLiveRefresh):
  // requests filtered to the client's org.
  const pageHeard = [];
  const pageChannel = clientA.client
    .channel(`verify-${stamp}-page`)
    .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `org_id=eq.${orgA.id}` }, (p) => pageHeard.push(p.eventType))
    .subscribe();
  channels.push([clientA.client, pageChannel]);
  await wait(4000);

  const { data: req } = await clientA.client
    .from("requests")
    .insert({ org_id: orgA.id, created_by: clientA.id, title: "Launch reel", stage: "requested" })
    .select()
    .single();
  await staff.client.from("requests").update({ stage: "review" }).eq("id", req.id);
  await staff.client.from("comments").insert({ request_id: req.id, author_id: staff.id, body: "Internal: check audio", visibility: "internal" });
  await staff.client.from("comments").insert({ request_id: req.id, author_id: staff.id, body: "Ready for you!", visibility: "client" });
  await wait(4000);

  const { data: aEvents } = await clientA.client.from("activity_events").select("kind, summary, is_internal").eq("org_id", orgA.id).order("id");
  const kinds = (aEvents ?? []).map((e) => e.kind).join(",");
  check("request, stage change and client comment are logged for the client", kinds === "request_created,stage_changed,comment_added", kinds);
  check("stage change reads naturally", aEvents?.[1]?.summary === '"Launch reel" is ready for review', aEvents?.[1]?.summary);
  check("client can't see internal notes in the feed", !(aEvents ?? []).some((e) => e.is_internal));
  const { data: staffEvents } = await staff.client.from("activity_events").select("kind, is_internal").eq("org_id", orgA.id);
  check("staff see everything, including internal notes", (staffEvents ?? []).some((e) => e.is_internal) && staffEvents.length === 4, `${staffEvents?.length} events`);
  const { data: bSees } = await clientB.client.from("activity_events").select("id").eq("org_id", orgA.id);
  check("another client can't read this client's feed", (bSees?.length ?? 0) === 0);

  const { error: forgeErr } = await clientA.client
    .from("activity_events")
    .insert({ org_id: orgA.id, kind: "payment_received", summary: "Payment received: 1,000,000.00 USD" });
  check("nobody can write fake events", !!forgeErr, forgeErr?.code);
  const { error: rpcErr } = await clientA.client.rpc("log_activity", { p_org: orgA.id, p_kind: "payment_received", p_request: null, p_summary: "fake" });
  check("the logging function can't be called directly", !!rpcErr, rpcErr?.code);

  check("client A got live updates for their own work", heardByA.length >= 3, `${heardByA.length} live events`);
  check("live updates never include internal notes", !heardByA.some((e) => e.is_internal));
  check("client B received nothing about client A", heardByB.length === 0, `${heardByB.length} live events`);
  check("pipeline page hears the new request and the stage change live", pageHeard.includes("INSERT") && pageHeard.includes("UPDATE"), pageHeard.join(","));

  const { error: markErr } = await clientA.client.from("activity_reads").upsert({ user_id: clientA.id, seen_at: new Date().toISOString() });
  check("users can mark their own feed as read", !markErr, markErr?.message);
  const { error: otherMarkErr } = await clientA.client.from("activity_reads").upsert({ user_id: clientB.id, seen_at: new Date().toISOString() });
  check("users can't touch someone else's read marker", !!otherMarkErr);
} catch (err) {
  check("script ran without throwing", false, err.message);
} finally {
  for (const [client, ch] of channels) await client.removeChannel(ch);
  for (const id of created.orgIds) await admin.from("organizations").delete().eq("id", id);
  for (const id of created.userIds) await admin.auth.admin.deleteUser(id);
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
