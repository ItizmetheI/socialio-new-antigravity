import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import BrandKitEditor from "../components/workspace/BrandKitEditor";
import PageHeader from "../components/workspace/PageHeader";
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
    <div className="max-w-4xl">
      <PageHeader title="Brand kit" description="The rules our team follows for every post, reel and graphic. Keep it current and we stay on-brand." />
      <BrandKitEditor orgId={orgId} />
      {profile && <BrandAssets orgId={orgId} onboardingId={onboardingId} profileId={profile.id} />}
    </div>
  );
}
