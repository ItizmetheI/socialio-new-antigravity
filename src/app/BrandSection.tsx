import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import BrandKitEditor from "../components/workspace/BrandKitEditor";
import BrandAssets from "./BrandAssets";

// Account page section: the brand rules our team follows, plus uploads.
export default function BrandSection({ orgId }: { orgId: string }) {
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
    <div>
      <p className="text-sm text-on-surface-variant mb-6 max-w-xl">The rules our team follows for every post, reel and graphic. Keep it current and we stay on-brand.</p>
      <BrandKitEditor orgId={orgId} />
      {profile && <BrandAssets orgId={orgId} onboardingId={onboardingId} profileId={profile.id} />}
    </div>
  );
}
