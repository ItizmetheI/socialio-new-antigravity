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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      org_id: resolvedOrgId,
      full_name: fullName ?? null,
    },
  });
  if (inviteError || !invited.user) {
    return jsonResponse({ error: inviteError?.message ?? "Invite failed" }, 500);
  }

  return jsonResponse({ userId: invited.user.id, orgId: resolvedOrgId }, 200);
});
