// Deno Edge Function — deploy with `supabase functions deploy invite-client`
// (Phase 5). Needs the service-role key, so it can never run client-side;
// the browser only ever calls it via supabase.functions.invoke().
//
// Design note: rather than insert-then-update the profiles row, this passes
// role/org_id/full_name as auth user metadata to inviteUserByEmail(). The
// trg_handle_new_user trigger (schema.sql) reads that metadata and creates
// the profiles row correctly the moment auth.users gets the new row — no
// follow-up UPDATE needed, which also sidesteps trg_1_protect_profile_columns
// entirely (that trigger only fires on UPDATE, not INSERT).
//
// role/org_id specifically go in app_metadata, not user_metadata — see the
// comment at the inviteUserByEmail call below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://socialio.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteRole = "client" | "internal" | "admin";

interface InviteRequestBody {
  email: string;
  fullName?: string;
  role: InviteRole;
  orgId?: string;
  orgName?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: "Edge Function is missing required env vars" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  // Scoped to the caller's own JWT — used only to find out who is calling.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  // Service-role client — bypasses RLS, never exposed to the browser.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();
  if (callerProfileError || callerProfile?.role !== "admin") {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  let body: InviteRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { email, fullName, role, orgId, orgName } = body;
  if (!email || !role) {
    return jsonResponse({ error: "email and role are required" }, 400);
  }
  if (role === "client" && !orgId && !orgName) {
    return jsonResponse({ error: "orgId (existing org) or orgName (new org) is required for a client invite" }, 400);
  }

  let resolvedOrgId = orgId ?? null;
  let createdNewOrg = false;
  if (role === "client" && !resolvedOrgId) {
    const { data: newOrg, error: orgError } = await adminClient
      .from("organizations")
      .insert({ name: orgName })
      .select()
      .single();
    if (orgError || !newOrg) {
      return jsonResponse({ error: orgError?.message ?? "Failed to create organization" }, 500);
    }
    resolvedOrgId = newOrg.id;
    createdNewOrg = true;
  }

  // role/org_id go in app_metadata (service-role-only-settable) rather than
  // user_metadata, so nobody can self-promote via the client-settable field
  // once self-serve signup exists. full_name stays low-stakes, in
  // user_metadata. NOTE: trg_handle_new_user (schema.sql) also tries to read
  // app_metadata on INSERT, but GoTrue applies admin-supplied app_metadata to
  // auth.users in a step AFTER the initial row insert — an AFTER INSERT
  // trigger never sees it, so the trigger silently falls back to its
  // role='client'/org_id=null defaults. Verified live via
  // scripts/diagnose_rls.mjs. The explicit UPDATE below is the real fix —
  // don't remove it and rely on the trigger alone.
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName ?? null,
    },
    app_metadata: {
      role,
      org_id: resolvedOrgId,
    },
  });
  if (inviteError || !invited.user) {
    // Roll back the org we just created for this call — otherwise a failed
    // invite (bad email, rate limit) leaves an orphan org with no client,
    // and every retry creates another duplicate. Never delete an org that
    // was passed in as an existing orgId — that one isn't ours to remove.
    if (createdNewOrg && resolvedOrgId) {
      await adminClient.from("organizations").delete().eq("id", resolvedOrgId);
    }
    return jsonResponse({ error: inviteError?.message ?? "Invite failed" }, 500);
  }

  const { error: profileFixError } = await adminClient
    .from("profiles")
    .update({ role, org_id: resolvedOrgId })
    .eq("id", invited.user.id);
  if (profileFixError) {
    // The auth user + email invite already went out — can't cleanly undo
    // the email, but we can at least not leave a wrong-role profile and a
    // possibly-orphaned org behind for a retry to duplicate.
    await adminClient.auth.admin.deleteUser(invited.user.id);
    if (createdNewOrg && resolvedOrgId) {
      await adminClient.from("organizations").delete().eq("id", resolvedOrgId);
    }
    return jsonResponse({ error: profileFixError.message }, 500);
  }

  return jsonResponse({ userId: invited.user.id, orgId: resolvedOrgId }, 200);
});
