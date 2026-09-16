import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ProposalStatusBadge from "../components/StatusBadge";
import { REQUEST_STAGES } from "../lib/database.types";
import type { ClientOnboarding, Proposal, Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

export default function DashboardHome() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    Promise.all([
      supabase.from("client_onboarding").select("*").eq("org_id", orgId).maybeSingle(),
      supabase
        .from("proposals")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("requests").select("*").eq("org_id", orgId),
    ]).then(([onboardingRes, proposalRes, requestsRes]) => {
      if (!isMounted) return;
      if (onboardingRes.error || proposalRes.error || requestsRes.error) {
        setState("error");
        return;
      }
      setOnboarding(onboardingRes.data as ClientOnboarding | null);
      setProposal(proposalRes.data as Proposal | null);
      setRequests((requestsRes.data ?? []) as Request[]);
      setState("ready");
    });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

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
        <ErrorBanner message="Couldn't load your dashboard. Try refreshing." />
      </div>
    );
  }

  const stageCounts = REQUEST_STAGES.map(({ value, label }) => ({
    label,
    count: requests.filter((r) => r.stage === value).length,
  }));

  const needsOnboarding = !onboarding || onboarding.status === "not_started" || onboarding.status === "in_progress";

  return (
    <div className="p-10 max-w-5xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">
        {needsOnboarding
          ? "Let's get to know your business."
          : proposal?.status === "pending"
            ? "Your proposal is ready."
            : "Overview"}
      </h1>

      {needsOnboarding && (
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 mb-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border bg-white/5 text-on-surface-variant border-white/10">
              Next step
            </span>
            <p className="text-on-surface-variant mt-4 max-w-md">
              {onboarding?.status === "in_progress"
                ? "Pick up where you left off — a few more questions and we can start curating your plan."
                : "Tell us about your business so we can curate the right plan for you."}
            </p>
          </div>
          <Link
            to="/app/onboarding"
            className="px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            {onboarding?.status === "in_progress" ? "Continue" : "Get started"} &rarr;
          </Link>
        </div>
      )}

      {!needsOnboarding && proposal?.status === "pending" && (
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 mb-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <ProposalStatusBadge status={proposal.status} />
            <p className="text-on-surface-variant mt-4 max-w-md">
              Review the scope and pricing we put together, then approve to kick off work.
            </p>
          </div>
          <Link
            to="/app/proposal"
            className="px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Review proposal &rarr;
          </Link>
        </div>
      )}

      {!needsOnboarding && !proposal && (
        <EmptyState
          title="No proposal yet"
          description="Once we've had a chance to scope your work, your proposal will show up here."
        />
      )}

      {!needsOnboarding && proposal?.status === "approved" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stageCounts.map(({ label, count }) => (
            <div key={label} className="bg-surface-container border border-white/10 rounded-2xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{count}</div>
              <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
