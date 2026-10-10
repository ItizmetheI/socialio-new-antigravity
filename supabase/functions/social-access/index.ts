// Deno Edge Function — client social-account logins (schema_social_access.sql).
// The only code that can write social_logins or see a password: it encrypts
// on save and decrypts on a staff "reveal", logging every action.
// verify_jwt = true.
//
// Body: { action, ... }
//   save       { id?, orgId?, platform, label?, username, password?, notes? }
//              client: own org only; staff: any org (orgId). On update an
//              empty password keeps the old one.
//   remove     { id }                       client (own org) or staff
//   unlock     { password }                 staff only: re-enter your own
//                                           password -> vault open 10 minutes
//   reveal     { id }                       staff only, vault unlocked
//                                           -> { password, notes }
//   set_status { id, status, note? }        staff only
//
// Against a stolen team login: reveal needs a fresh unlock (5 wrong
// passwords in 15 minutes locks that person out) and at most 30 reveals an
// hour. Every action is logged with IP and device. Responses are no-store.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { importVaultKey, open, seal } from "../_shared/vault.ts";

const PLATFORMS = ["instagram", "tiktok", "linkedin", "x", "facebook", "youtube", "blog", "other"];
const STATUSES = ["submitted", "working", "not_working"];
const LIMITS = { username: 200, password: 500, notes: 1000, label: 80, note: 300 };
const UNLOCK_MINUTES = 10;
const MAX_FAILED_UNLOCKS = 5; // per 15 minutes
const MAX_REVEALS_PER_HOUR = 30;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  const json = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const vaultKey = Deno.env.get("SOCIAL_VAULT_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !vaultKey) {
    return json({ error: "Edge Function is missing required env vars" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: who, error: whoError } = await caller.auth.getUser();
  if (whoError && !(whoError.status && whoError.status >= 400 && whoError.status < 500)) {
    return json({ error: "Busy right now. Please try again in a few seconds." }, 503);
  }
  if (whoError || !who.user) return json({ error: "Invalid session" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: me } = await admin.from("profiles").select("id, org_id, role, is_active").eq("id", who.user.id).single();
  if (!me || me.is_active === false) return json({ error: "This account is deactivated" }, 403);
  const isStaff = me.role === "internal" || me.role === "admin";
  if (!isStaff && (me.role !== "client" || !me.org_id)) return json({ error: "Not allowed" }, 403);

  const key = await importVaultKey(vaultKey);
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 100) || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const logEvent = (loginId: string | null, orgId: string | null, action: string, detail?: string) =>
    admin.from("social_login_events").insert({
      login_id: loginId,
      org_id: orgId,
      actor_id: me.id,
      action,
      detail: detail?.slice(0, 200) ?? null,
      ip,
      user_agent: userAgent,
    });
  const countMine = async (action: string, sinceMinutes: number) => {
    const { count } = await admin
      .from("social_login_events")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", me.id)
      .eq("action", action)
      .gte("created_at", new Date(Date.now() - sinceMinutes * 60000).toISOString());
    return count ?? 0;
  };

  // A row the caller may touch: staff any, a client only their own org's.
  const loadRow = async (id: unknown) => {
    if (typeof id !== "string") return null;
    const { data } = await admin.from("social_logins").select("id, org_id, platform, username, secret").eq("id", id).maybeSingle();
    if (!data || (!isStaff && data.org_id !== me.org_id)) return null;
    return data;
  };

  const action = body.action;

  if (action === "save") {
    const platform = str(body.platform);
    const username = str(body.username);
    const password = typeof body.password === "string" ? body.password : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const label = str(body.label) || null;
    if (!PLATFORMS.includes(platform)) return json({ error: "Pick a platform" }, 400);
    if (!username || username.length > LIMITS.username) return json({ error: "Enter the username or email you log in with" }, 400);
    if (password.length > LIMITS.password || (notes?.length ?? 0) > LIMITS.notes || (label?.length ?? 0) > LIMITS.label) {
      return json({ error: "That's too long" }, 400);
    }

    if (body.id) {
      const row = await loadRow(body.id);
      if (!row) return json({ error: "Login not found" }, 404);
      const old = JSON.parse(await open(key, row.secret, row.id)) as { password: string; notes: string };
      const secret = await seal(key, JSON.stringify({ password: password || old.password, notes: notes ?? old.notes }), row.id);
      const { error } = await admin
        .from("social_logins")
        .update({ platform, username, label, secret, status: "submitted", status_note: null, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) return json({ error: error.message }, 500);
      await logEvent(row.id, row.org_id, "updated", `${platform} · ${username}${password ? " · new password" : ""}`);
      return json({ id: row.id }, 200);
    }

    if (!password) return json({ error: "Enter the password" }, 400);
    const orgId = isStaff ? str(body.orgId) : me.org_id;
    if (!orgId) return json({ error: "Which client is this for?" }, 400);
    const id = crypto.randomUUID();
    const secret = await seal(key, JSON.stringify({ password, notes: notes ?? "" }), id);
    const { error } = await admin.from("social_logins").insert({ id, org_id: orgId, platform, label, username, secret, created_by: me.id });
    if (error) return json({ error: error.message }, 500);
    await logEvent(id, orgId, "saved", `${platform} · ${username}`);
    return json({ id }, 200);
  }

  if (action === "remove") {
    const row = await loadRow(body.id);
    if (!row) return json({ error: "Login not found" }, 404);
    await logEvent(row.id, row.org_id, "removed", `${row.platform} · ${row.username}`);
    const { error } = await admin.from("social_logins").delete().eq("id", row.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  }

  if (!isStaff) return json({ error: "Only the Socialio team can do that" }, 403);

  if (action === "unlock") {
    if ((await countMine("unlock_failed", 15)) >= MAX_FAILED_UNLOCKS) {
      await logEvent(null, null, "blocked", "too many wrong passwords");
      return json({ error: "Too many wrong passwords. Try again in 15 minutes.", code: "locked_out" }, 429);
    }
    const password = typeof body.password === "string" ? body.password : "";
    const check = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: who.user.email, password }),
    });
    if (!password || !check.ok) {
      await logEvent(null, null, "unlock_failed");
      return json({ error: "That password isn't right." }, 403);
    }
    // The check signed in once more; end that extra session straight away.
    const { access_token } = await check.json();
    await fetch(`${supabaseUrl}/auth/v1/logout?scope=local`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` } });
    const until = new Date(Date.now() + UNLOCK_MINUTES * 60000).toISOString();
    await admin.from("social_vault_unlocks").upsert({ user_id: me.id, unlocked_until: until });
    await logEvent(null, null, "unlocked");
    return json({ unlocked_until: until }, 200);
  }

  if (action === "reveal") {
    const row = await loadRow(body.id);
    if (!row) return json({ error: "Login not found" }, 404);
    const { data: unlock } = await admin.from("social_vault_unlocks").select("unlocked_until").eq("user_id", me.id).maybeSingle();
    if (!unlock || new Date(unlock.unlocked_until).getTime() < Date.now()) {
      return json({ error: "Confirm your password to open the vault.", code: "vault_locked" }, 401);
    }
    if ((await countMine("revealed", 60)) >= MAX_REVEALS_PER_HOUR) {
      await logEvent(row.id, row.org_id, "blocked", "reveal limit reached");
      return json({ error: `That's ${MAX_REVEALS_PER_HOUR} passwords this hour. The limit protects clients if an account is stolen. Try again later.` }, 429);
    }
    let secret: { password: string; notes: string };
    try {
      secret = JSON.parse(await open(key, row.secret, row.id));
    } catch {
      return json({ error: "Couldn't decrypt this login. Ask the client to enter it again." }, 500);
    }
    const now = new Date().toISOString();
    await admin.from("social_logins").update({ last_revealed_at: now, last_revealed_by: me.id }).eq("id", row.id);
    await logEvent(row.id, row.org_id, "revealed", `${row.platform} · ${row.username}`);
    return json({ password: secret.password, notes: secret.notes }, 200);
  }

  if (action === "set_status") {
    const row = await loadRow(body.id);
    const status = str(body.status);
    const note = str(body.note).slice(0, LIMITS.note) || null;
    if (!row) return json({ error: "Login not found" }, 404);
    if (!STATUSES.includes(status)) return json({ error: "Unknown status" }, 400);
    const { error } = await admin.from("social_logins").update({ status, status_note: note }).eq("id", row.id);
    if (error) return json({ error: error.message }, 500);
    await logEvent(row.id, row.org_id, "status", `${row.platform}: ${status}${note ? ` (${note})` : ""}`);
    return json({ ok: true }, 200);
  }

  return json({ error: "Unknown action" }, 400);
});
