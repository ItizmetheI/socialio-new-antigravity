import { supabase } from "../../lib/supabase";
import type { UserRole } from "../../lib/database.types";

export type InviteUserParams = {
  email: string;
  fullName: string;
  role: UserRole;
  orgId?: string;
  orgName?: string;
};

export type InviteUserResult = {
  userId: string;
  orgId: string | null;
};

// Thin wrapper around the invite-client Edge Function (supabase/functions/
// invite-client) — real code today, but it has nothing to call until that
// function is deployed in Phase 5, so every caller must handle the error.
export async function inviteUser(params: InviteUserParams) {
  const { data, error } = await supabase.functions.invoke<InviteUserResult>("invite-client", {
    body: params,
  });
  return { data, error };
}
