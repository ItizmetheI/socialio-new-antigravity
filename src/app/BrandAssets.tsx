import React, { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import DeliverableList, { DELIVERABLES_BUCKET, storagePathFor } from "../components/DeliverableList";
import type { OnboardingAsset } from "../lib/database.types";

type Props = {
  orgId: string;
  onboardingId: string | null;
  profileId: string;
};

// Logos, fonts, product photos, brand guidelines — anything the team needs
// before making content. Stored under {org_id}/onboarding/ (the only prefix
// clients may upload to; see schema_onboarding.sql).
export default function BrandAssets({ orgId, onboardingId, profileId }: Props) {
  const [assets, setAssets] = useState<OnboardingAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!onboardingId) return;
    let isMounted = true;
    supabase
      .from("onboarding_assets")
      .select("*")
      .eq("onboarding_id", onboardingId)
      .order("created_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!isMounted) return;
        if (loadError) setError("Couldn't load your files. Try refreshing.");
        else setAssets((data ?? []) as OnboardingAsset[]);
      });
    return () => {
      isMounted = false;
    };
  }, [onboardingId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !onboardingId) return;
    setIsUploading(true);
    setError("");
    const added: OnboardingAsset[] = [];
    for (const file of files) {
      const path = storagePathFor(orgId, "onboarding", file.name);
      const { error: uploadError } = await supabase.storage.from(DELIVERABLES_BUCKET).upload(path, file);
      if (uploadError) {
        setError(`Couldn't upload ${file.name}: ${uploadError.message}`);
        continue;
      }
      const { data, error: rowError } = await supabase
        .from("onboarding_assets")
        .insert({ onboarding_id: onboardingId, file_path: path, uploaded_by: profileId })
        .select()
        .single();
      if (rowError || !data) {
        setError(`Uploaded ${file.name}, but couldn't save it to your list. Try again.`);
        continue;
      }
      added.push(data as OnboardingAsset);
    }
    setAssets((current) => [...added, ...current]);
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="py-10 border-t border-white/10">
      <h2 className="font-bold text-white mb-1">Brand files</h2>
      <p className="text-sm text-on-surface-variant mb-5">Logos, fonts, product photos, brand guidelines — anything we should work from.</p>
      {onboardingId ? (
        <>
          <div className="mb-5">
            <DeliverableList deliverables={assets} emptyText="No files yet." />
          </div>
          {error && <p className="text-error text-sm mb-4">{error}</p>}
          <label className="btn-secondary cursor-pointer w-fit focus-within:outline focus-within:outline-2 focus-within:outline-primary">
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload files"}
            <input ref={inputRef} type="file" multiple onChange={upload} disabled={isUploading} className="sr-only" />
          </label>
        </>
      ) : (
        <p className="text-sm text-on-surface-variant">Save your answers above first, then you can add files here.</p>
      )}
    </section>
  );
}
