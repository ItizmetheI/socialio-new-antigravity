import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import BrandKitEditor from "../components/workspace/BrandKitEditor";
import BrandAssets from "./BrandAssets";
import type { ClientOutletContext } from "./ClientLayout";

export default function BrandKitPage() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const { profile } = useAuth();
  const [onboardingId, setOnboardingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("client_onboarding")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) setOnboardingId((data as { id: string } | null)?.id ?? null);
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  return (
    <div className="p-5 md:p-10 max-w-5xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-1">Brand kit</h1>
      <p className="text-on-surface-variant text-sm mb-8">The rules our team follows for every post, reel and graphic. Keep it current and we stay on-brand.</p>
      <BrandKitEditor orgId={orgId} />
      {profile && <BrandAssets orgId={orgId} onboardingId={onboardingId} profileId={profile.id} />}
    </div>
  );
}
