import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import type { ClientOnboarding, Organization, OnboardingAnswers } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

type Row = { onboarding: ClientOnboarding; org: Organization | undefined };

const ANSWER_LABELS: Record<keyof OnboardingAnswers, string> = {
  business_name: "Business name",
  business_description: "What the business does",
  target_audience: "Target audience",
  brand_voice: "Brand voice",
  platforms: "Platforms",
  existing_handles: "Existing profiles",
  goals: "Goals",
  inspiration: "Inspiration accounts",
  content_guidelines: "Guidelines / avoid",
};

export default function OnboardingReview() {
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const [onboardingRes, orgsRes] = await Promise.all([
      supabase.from("client_onboarding").select("*").neq("status", "not_started").order("created_at", { ascending: false }),
      supabase.from("organizations").select("*"),
    ]);
    if (onboardingRes.error || orgsRes.error) {
      setState("error");
      return;
    }
    const orgs = (orgsRes.data ?? []) as Organization[];
    const onboardings = (onboardingRes.data ?? []) as ClientOnboarding[];
    setRows(onboardings.map((onboarding) => ({ onboarding, org: orgs.find((o) => o.id === onboarding.org_id) })));
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markReviewed = async (onboardingId: string) => {
    setActionError("");
    const { error } = await supabase
      .from("client_onboarding")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: profile?.id })
      .eq("id", onboardingId);
    if (error) {
      setActionError(error.message);
      return;
    }
    await load();
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
        <ErrorBanner message="Couldn't load onboarding submissions. Try refreshing." />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-10">
        <EmptyState
          title="No submissions yet"
          description="Onboarding responses show up here once a client saves or submits theirs."
        />
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Onboarding</h1>
      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}
      <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden">
        {rows.map(({ onboarding, org }, index) => {
          const isExpanded = expandedId === onboarding.id;
          return (
            <div key={onboarding.id} className={index !== rows.length - 1 ? "border-b border-white/5" : ""}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : onboarding.id)}
                className="w-full flex items-center justify-between px-8 py-6 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <div className="font-bold text-white">{org?.name ?? "Unknown org"}</div>
                  <div className="text-xs text-on-surface-variant">
                    {onboarding.submitted_at
                      ? `Submitted ${new Date(onboarding.submitted_at).toLocaleDateString()}`
                      : "In progress — not yet submitted"}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${
                    onboarding.status === "reviewed"
                      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                      : onboarding.status === "submitted"
                        ? "bg-amber-400/10 text-amber-300 border-amber-400/20"
                        : "bg-white/5 text-on-surface-variant border-white/10"
                  }`}
                >
                  {onboarding.status.replace("_", " ")}
                </span>
              </button>
              {isExpanded && (
                <div className="px-8 pb-8">
                  <div className="bg-background/50 rounded-2xl p-6 grid gap-4 mb-4">
                    {(Object.keys(ANSWER_LABELS) as (keyof OnboardingAnswers)[]).map((key) => {
                      const value = onboarding.answers?.[key];
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;
                      return (
                        <div key={key}>
                          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                            {ANSWER_LABELS[key]}
                          </div>
                          <div className="text-white text-sm">{Array.isArray(value) ? value.join(", ") : value}</div>
                        </div>
                      );
                    })}
                  </div>
                  {onboarding.status === "submitted" && (
                    <button
                      onClick={() => markReviewed(onboarding.id)}
                      className="px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                    >
                      Mark reviewed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
