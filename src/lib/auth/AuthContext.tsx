import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
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
    <AuthContext.Provider value={{ session, profile, isLoading, signIn, signOut }}>
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
