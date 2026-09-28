import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDate, localDateString } from "../lib/format";
import { calendarDay, platformLabel } from "../components/workspace/requestMeta";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ProposalStatusBadge, { PlanStatusBadge } from "../components/StatusBadge";
import { REQUEST_STAGES } from "../lib/database.types";
import type { ClientOnboarding, Plan, Proposal, Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

// What a client needs at a glance: work waiting on their review, and
// what's going out next.
function OverviewPanels({ requests }: { requests: Request[] }) {
  const toReview = requests.filter((r) => r.stage === "review");
  const today = localDateString();
  const upNext = requests
    .filter((r) => r.stage !== "delivered")
    .map((r) => ({ request: r, placed: calendarDay(r) }))
    .filter((x): x is { request: Request; placed: NonNullable<ReturnType<typeof calendarDay>> } => !!x.placed && x.placed.day >= today)
    .sort((a, b) => a.placed.day.localeCompare(b.placed.day))
    .slice(0, 4);
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-10">
      <section className={`rounded-3xl p-6 border ${toReview.length ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface-container"}`}>
        <h2 className="font-bold text-white mb-4">Waiting on you</h2>
        {toReview.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nothing to review right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {toReview.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-white truncate">{r.title}</span>
                <Link to={`/app/requests/${r.id}`} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-[#fff] hover:opacity-90">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-3xl p-6 border border-white/10 bg-surface-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Up next</h2>
          <Link to="/app/calendar" className="text-xs text-primary hover:underline">Calendar &rarr;</Link>
        </div>
        {upNext.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nothing scheduled yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upNext.map(({ request: r, placed }) => (
              <li key={r.id}>
                <Link to={`/app/requests/${r.id}`} className="block group">
                  <div className="text-xs text-on-surface-variant">
                    {formatDate(placed.day)} · {placed.kind === "publish" ? "goes live" : "due"}
                    {r.platforms.length > 0 && ` · ${r.platforms.map(platformLabel).join(", ")}`}
                  </div>
                  <div className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{r.title}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DashboardHome() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    Promise.all([
      supabase.from("client_onboarding").select("*").eq("org_id", orgId).maybeSingle(),
      supabase
        .from("plans")
        .select("*")
        .eq("org_id", orgId)
        .neq("status", "superseded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("proposals")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("requests").select("*").eq("org_id", orgId),
    ]).then(([onboardingRes, planRes, proposalRes, requestsRes]) => {
      if (!isMounted) return;
      if (onboardingRes.error || planRes.error || proposalRes.error || requestsRes.error) {
        setState("error");
        return;
      }
      setOnboarding(onboardingRes.data as ClientOnboarding | null);
      setPlan(planRes.data as Plan | null);
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
      <div className="p-5 md:p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-5 md:p-10">
        <ErrorBanner message="Couldn't load your dashboard. Try refreshing." />
      </div>
    );
  }

  const stageCounts = REQUEST_STAGES.map(({ value, label }) => ({
    label,
    count: requests.filter((r) => r.stage === value).length,
  }));

  const needsOnboarding = !onboarding || onboarding.status === "not_started" || onboarding.status === "in_progress";
  // Plans replace proposals going forward — an org only falls back to the
  // proposal card when it has no plan at all (legacy orgs from before
  // Phase 3). An org is never shown both.
  const planPending = plan && (plan.status === "sent" || plan.status === "viewed" || plan.status === "changes_requested");
  const isApproved = plan?.status === "approved" || (!plan && proposal?.status === "approved");

  return (
    <div className="p-5 md:p-10 max-w-5xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">
        {needsOnboarding
          ? "Let's get to know your business."
          : planPending
            ? "Your plan is ready."
            : !plan && proposal?.status === "pending"
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

      {!needsOnboarding && planPending && plan && (
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 mb-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <PlanStatusBadge status={plan.status} />
            <p className="text-on-surface-variant mt-4 max-w-md">
              {plan.status === "changes_requested"
                ? "We're revising this based on your feedback — check back soon."
                : "Review the scope and pricing we curated, then approve to kick off work."}
            </p>
          </div>
          {plan.status !== "changes_requested" && (
            <Link
              to="/app/plan"
              className="px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              Review plan &rarr;
            </Link>
          )}
        </div>
      )}

      {!needsOnboarding && !plan && proposal?.status === "pending" && (
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

      {!needsOnboarding && !plan && !proposal && (
        <EmptyState
          title="No plan yet"
          description="Once we've reviewed your onboarding info, your curated plan will show up here."
        />
      )}

      {!needsOnboarding && isApproved && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {stageCounts.map(({ label, count }) => (
              <div key={label} className="bg-surface-container border border-white/10 rounded-2xl p-6">
                <div className="text-3xl font-bold text-white mb-1">{count}</div>
                <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">{label}</div>
              </div>
            ))}
          </div>

          <OverviewPanels requests={requests} />

          {requests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Once work kicks off, requests will show up here."
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white">Recent activity</h2>
                <Link to="/app/requests" className="text-xs text-primary hover:underline">
                  View all &rarr;
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {[...requests]
                  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                  .slice(0, 5)
                  .map((request) => {
                    const stageLabel = REQUEST_STAGES.find((s) => s.value === request.stage)?.label ?? request.stage;
                    return (
                      <Link
                        key={request.id}
                        to={`/app/requests/${request.id}`}
                        className="bg-surface-container border border-white/10 hover:border-primary/30 rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-white text-sm mb-1">{request.title}</div>
                          <div className="text-xs text-on-surface-variant">
                            {stageLabel}
                            {request.due_date && ` · Due ${formatDate(request.due_date)}`}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
