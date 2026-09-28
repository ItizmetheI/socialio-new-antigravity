import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDate, localDateString } from "../lib/format";
import { calendarDay } from "../components/workspace/requestMeta";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/workspace/PageHeader";
import StatStrip from "../components/workspace/StatStrip";
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-12">
      <section>
        <h2 className="flex items-center gap-2 font-bold text-white mb-3">
          Waiting on you
          {toReview.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-on-primary">{toReview.length}</span>
          )}
        </h2>
        {toReview.length === 0 ? (
          <p className="text-sm text-on-surface-variant border-y border-white/10 py-4">Nothing to review right now.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {toReview.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                <span className="text-sm font-bold text-white truncate min-w-0">{r.title}</span>
                <Link to={`/app/requests/${r.id}`} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">Up next</h2>
          <Link to="/app/calendar" className="text-xs text-primary hover:underline">Calendar &rarr;</Link>
        </div>
        {upNext.length === 0 ? (
          <p className="text-sm text-on-surface-variant border-y border-white/10 py-4">Nothing scheduled yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {upNext.map(({ request: r, placed }) => (
              <li key={r.id}>
                <Link to={`/app/requests/${r.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-1 py-3.5 group">
                  <span className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate min-w-0">{r.title}</span>
                  <span className="text-xs text-on-surface-variant shrink-0">
                    {formatDate(placed.day)} · {placed.kind === "publish" ? "goes live" : "due"}
                  </span>
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
  const { orgId, orgName } = useOutletContext<ClientOutletContext>();
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
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
    <div>
      <PageHeader
        title={
          needsOnboarding
            ? "Let's get to know your business."
            : planPending
              ? "Your plan is ready."
              : !plan && proposal?.status === "pending"
                ? "Your proposal is ready."
                : orgName || "Overview"
        }
        description={isApproved && !needsOnboarding ? "Where everything stands today." : undefined}
      />

      {needsOnboarding && (
        <div className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 mb-10 flex items-center justify-between gap-6 flex-wrap">
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
            className="btn-primary"
          >
            {onboarding?.status === "in_progress" ? "Continue" : "Get started"} &rarr;
          </Link>
        </div>
      )}

      {!needsOnboarding && planPending && plan && (
        <div className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 mb-10 flex items-center justify-between gap-6 flex-wrap">
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
              className="btn-primary"
            >
              Review plan &rarr;
            </Link>
          )}
        </div>
      )}

      {!needsOnboarding && !plan && proposal?.status === "pending" && (
        <div className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 mb-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <ProposalStatusBadge status={proposal.status} />
            <p className="text-on-surface-variant mt-4 max-w-md">
              Review the scope and pricing we put together, then approve to kick off work.
            </p>
          </div>
          <Link
            to="/app/proposal"
            className="btn-primary"
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
          <StatStrip stats={stageCounts.map(({ label, count }) => ({ label, value: count, isAccent: label === "Review" && count > 0 }))} />

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
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {[...requests]
                  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                  .slice(0, 5)
                  .map((request) => {
                    const stageLabel = REQUEST_STAGES.find((s) => s.value === request.stage)?.label ?? request.stage;
                    return (
                      <li key={request.id}>
                        <Link
                          to={`/app/requests/${request.id}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-1 py-4 group"
                        >
                          <span className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate min-w-0">{request.title}</span>
                          <span className="text-xs text-on-surface-variant shrink-0">
                            {stageLabel}
                            {request.due_date && ` · Due ${formatDate(request.due_date)}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
