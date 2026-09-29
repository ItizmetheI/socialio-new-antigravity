import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../supabase";
import type { Profile } from "../database.types";
import { TEST_MODE } from "../testMode/flag";
import { TEST_IDENTITIES, getStoredTestIdentityKey, setStoredTestIdentityKey } from "../testMode/testAuth";

function buildTestSessionAndProfile(): { session: Session; profile: Profile } | null {
  const key = getStoredTestIdentityKey();
  if (!key) return null;
  const identity = TEST_IDENTITIES[key];
  const session = {
    user: { id: identity.id, email: identity.email },
  } as Session;
  const profile: Profile = {
    id: identity.id,
    org_id: identity.orgId,
    role: identity.role,
    full_name: identity.fullName,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  return { session, profile };
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; code?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; alreadyRegistered?: boolean }>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// supabase-js reports an unreachable server as a bare "Failed to fetch",
// which tells a person nothing. Say what's actually wrong.
function authErrorMessage(error: { message: string; code?: string } | null): string | null {
  if (!error) return null;
  if (!isSupabaseConfigured) {
    return "Sign-in isn't set up on this copy of the site yet (its Supabase settings are missing).";
  }
  if (/weak_password|password should/i.test(`${(error as { code?: string }).code ?? ""} ${error.message}`)) {
    return "Use at least 8 characters, with at least one letter and one number.";
  }
  const code = (error as { code?: string }).code;
  if (code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
    return "That email and password don't match. Check both, or reset your password.";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
    return "Confirm your email first: open the link we sent when you signed up.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || /rate limit|too many requests/i.test(error.message)) {
    return "Too many attempts from this network. Wait a few minutes and try again.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(error.message)) {
    return "Couldn't reach the sign-in server. Check your connection, turn off any ad or tracker blocker for this site, and try again.";
  }
  return error.message;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (TEST_MODE) {
      const identity = buildTestSessionAndProfile();
      setSession(identity?.session ?? null);
      setProfile(identity?.profile ?? null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    // Whose profile is loaded (or loading). A token refresh for the same user
    // doesn't refetch; a new user holds isLoading until their profile lands,
    // so pages never see "signed in but no profile yet" and flash the form.
    let profileUserId: string | null = null;

    const loadProfile = async (userId: string) => {
      if (userId === profileUserId) return;
      profileUserId = userId;
      setIsLoading(true);
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (!isMounted || profileUserId !== userId) return;
      if (error) {
        console.warn("Failed to load profile:", error.message);
        profileUserId = null; // let the next auth event retry
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      if (initialSession) {
        loadProfile(initialSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Sync callback (not async) — async callbacks on onAuthStateChange can
    // deadlock on nested TOKEN_REFRESHED events per the installed auth-js
    // types' own deprecation note. loadProfile is fired without awaiting it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        profileUserId = null;
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (TEST_MODE) {
      // The role switcher (rendered only in test mode) is the real entry
      // point — this just gives the login form itself something to do.
      setStoredTestIdentityKey("client-approved");
      const identity = buildTestSessionAndProfile();
      setSession(identity?.session ?? null);
      setProfile(identity?.profile ?? null);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: authErrorMessage(error), code: error?.code };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (TEST_MODE) {
      return { error: "Signup isn't available in test mode." };
    }
    // Only full_name goes here — role/org_id are never client-settable.
    // handle_new_user() (schema.sql) defaults role to 'client' and org_id to
    // null when app_metadata has neither, which is exactly the state a
    // self-serve signup should land in until checkout links them to an org.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Confirmation link returns to the site they signed up on (must be in
      // Supabase Auth's redirect allow-list, else it falls back to Site URL).
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) return { error: authErrorMessage(error), alreadyRegistered: false };
    // With email confirmation on, Supabase answers a sign-up for an email
    // that already has a confirmed account with a "success" that has no
    // identities and sends no email (so it can't be used to probe who's
    // registered). Tell the person, instead of leaving them waiting.
    const alreadyRegistered = !!data.user && (data.user.identities?.length ?? 0) === 0;
    return { error: null, alreadyRegistered };
  };

  // Sends the sign-up confirmation email again (Supabase rate-limits this).
  const resendConfirmation = async (email: string) => {
    if (TEST_MODE) return { error: null };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    return { error: authErrorMessage(error) };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (TEST_MODE) {
      return { error: "Password reset isn't available in test mode." };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/app/reset-password`,
    });
    return { error: authErrorMessage(error) };
  };

  const signOut = async () => {
    if (TEST_MODE) {
      setStoredTestIdentityKey(null);
      setSession(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signIn, signUp, resendConfirmation, resetPasswordForEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
