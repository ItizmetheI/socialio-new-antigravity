import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import type { ClientOnboarding, OnboardingAnswers } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "X"];

const FIELD_CONFIG: {
  key: keyof OnboardingAnswers;
  label: string;
  placeholder: string;
  type: "input" | "textarea";
  required?: boolean;
}[] = [
  { key: "business_name", label: "Business name", placeholder: "Acme Co.", type: "input", required: true },
  {
    key: "business_description",
    label: "What does your business do?",
    placeholder: "A quick summary of your product, service, and who you serve.",
    type: "textarea",
    required: true,
  },
  {
    key: "target_audience",
    label: "Who's your target audience?",
    placeholder: "Age range, interests, where they hang out online...",
    type: "textarea",
    required: true,
  },
  {
    key: "brand_voice",
    label: "How should your content sound?",
    placeholder: "Playful, professional, bold, minimal...",
    type: "input",
  },
  {
    key: "existing_handles",
    label: "Your existing social profiles",
    placeholder: "@yourbrand on Instagram, TikTok, etc.",
    type: "input",
  },
  {
    key: "goals",
    label: "What does success look like?",
    placeholder: "Follower growth, engagement, sales, brand awareness...",
    type: "textarea",
    required: true,
  },
  {
    key: "inspiration",
    label: "Any accounts you admire?",
    placeholder: "Competitors or brands whose content you like.",
    type: "input",
  },
  {
    key: "content_guidelines",
    label: "Anything we should avoid?",
    placeholder: "Topics, phrasing, or claims that are off-limits.",
    type: "textarea",
  },
];

const REQUIRED_KEYS = FIELD_CONFIG.filter((f) => f.required).map((f) => f.key);

export default function Onboarding() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [row, setRow] = useState<ClientOnboarding | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("client_onboarding")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) {
      setState("error");
      return;
    }
    if (data) {
      const record = data as ClientOnboarding;
      setRow(record);
      setAnswers(record.answers ?? {});
      setPlatforms(record.answers?.platforms ?? []);
    }
    setState("ready");
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) => (prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]));
  };

  const isComplete = REQUIRED_KEYS.every((key) => String(answers[key] ?? "").trim().length > 0);

  const save = async (nextStatus: "in_progress" | "submitted") => {
    setSaveError("");
    setIsSaving(true);
    const nextAnswers: OnboardingAnswers = { ...answers, platforms };

    let result;
    if (row) {
      result = await supabase
        .from("client_onboarding")
        .update({ answers: nextAnswers, status: nextStatus })
        .eq("id", row.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("client_onboarding")
        .insert({ org_id: orgId, answers: nextAnswers, status: nextStatus })
        .select()
        .single();
    }
    setIsSaving(false);
    if (result.error) {
      setSaveError(result.error.message);
      return;
    }
    setRow(result.data as ClientOnboarding);
    setSavedAt(Date.now());
  };

  if (state === "loading") {
    return (
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-10">
        <ErrorBanner message="Couldn't load onboarding. Try refreshing." />
      </div>
    );
  }

  const isLocked = row?.status === "reviewed";

  return (
    <div className="p-10 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="hero-display font-bold text-3xl text-white">Tell us about your business</h1>
      </div>
      <p className="text-on-surface-variant mb-8">
        {isLocked
          ? "Reviewed by your account manager — reach out if anything needs to change."
          : "This shapes the plan we curate for you. Save as you go, submit when ready."}
      </p>

      {row?.status === "submitted" && (
        <div className="mb-8 flex items-center gap-2 text-primary font-bold text-sm border-l-2 border-primary pl-4 py-2">
          <CheckCircle2 className="w-5 h-5" /> Submitted — we'll follow up once it's reviewed.
        </div>
      )}
      {isLocked && (
        <div className="mb-8 flex items-center gap-2 text-primary font-bold text-sm border-l-2 border-primary pl-4 py-2">
          <CheckCircle2 className="w-5 h-5" /> Reviewed
        </div>
      )}

      <div className="bg-surface-container border border-white/10 rounded-3xl p-8 flex flex-col gap-6">
        {FIELD_CONFIG.map((field) => (
          <div key={field.key}>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
              {field.label} {field.required && <span className="text-primary">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                rows={3}
                disabled={isLocked}
                value={answers[field.key] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-60"
              />
            ) : (
              <input
                type="text"
                disabled={isLocked}
                value={answers[field.key] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
              />
            )}
          </div>
        ))}

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
            Which platforms matter most?
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((platform) => (
              <button
                key={platform}
                type="button"
                disabled={isLocked}
                onClick={() => togglePlatform(platform)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  platforms.includes(platform)
                    ? "bg-primary text-on-primary-fixed border-primary"
                    : "bg-transparent text-white border-white/20 hover:bg-white/5"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {saveError && <ErrorBanner message={saveError} />}

        {!isLocked && (
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => save("in_progress")}
              disabled={isSaving}
              className="px-6 py-3 border border-white/20 text-white hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save draft"}
            </button>
            <button
              onClick={() => save("submitted")}
              disabled={isSaving || !isComplete}
              title={!isComplete ? "Fill in the required fields first" : undefined}
              className="px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {row?.status === "submitted" ? "Update submission" : "Submit"}
            </button>
            {savedAt && !isSaving && <span className="text-xs text-on-surface-variant">Saved.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
