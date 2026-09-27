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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// supabase-js reports an unreachable server as a bare "Failed to fetch",
// which tells a person nothing. Say what's actually wrong.
function authErrorMessage(error: { message: string } | null): string | null {
  if (!error) return null;
  if (!isSupabaseConfigured) {
    return "Sign-in isn't set up on this copy of the site yet (its Supabase settings are missing).";
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

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (!isMounted) return;
      if (error) {
        console.warn("Failed to load profile:", error.message);
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
    return { error: authErrorMessage(error) };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (TEST_MODE) {
      return { error: "Signup isn't available in test mode." };
    }
    // Only full_name goes here — role/org_id are never client-settable.
    // handle_new_user() (schema.sql) defaults role to 'client' and org_id to
    // null when app_metadata has neither, which is exactly the state a
    // self-serve signup should land in until checkout links them to an org.
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
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
    <AuthContext.Provider value={{ session, profile, isLoading, signIn, signUp, resetPasswordForEmail, signOut }}>
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
