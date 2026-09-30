import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Columns3, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import PageHeader from "../components/workspace/PageHeader";
import RequestCard from "../components/workspace/RequestCard";
import ContentCalendar from "../components/workspace/ContentCalendar";
import LedgerLines from "../components/workspace/LedgerLines";
import ResultsView from "../components/workspace/ResultsView";
import { STAGE_STYLE } from "../components/workspace/stageStyle";
import { computeLedger, loadLedgerData, type LedgerData } from "../components/workspace/LedgerData";
import { REQUEST_STAGES } from "../lib/database.types";
import type { ClientOnboarding, PerformanceReport, Plan, Proposal, Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";
import NewRequestForm from "./NewRequestForm";
import RequestDrawer from "./RequestDrawer";

type HomeData = {
  onboarding: ClientOnboarding | null;
  plan: Plan | null;
  proposal: Proposal | null;
  reports: PerformanceReport[];
  ledger: LedgerData;
};

const DELIVERED_SHOWN = 4;

type Banner = { tone: "needs-you" | "info"; text: string; action?: { label: string; to: string } };

// The one thing the client should do next, if anything. Amber = it's on
// them (same amber as "Needs your review"); blue = we're on it.
function nextStep(d: HomeData, toReview: Request[]): Banner | null {
  const { onboarding, plan, proposal } = d;
  if (!onboarding || onboarding.status === "not_started" || onboarding.status === "in_progress") {
    return {
      tone: "needs-you",
      text: onboarding?.status === "in_progress" ? "Finish telling us about your business so we can build your plan." : "Tell us about your business so we can build your plan.",
      action: { label: onboarding?.status === "in_progress" ? "Continue" : "Get started", to: "/app/onboarding" },
    };
  }
  if (plan && (plan.status === "sent" || plan.status === "viewed")) {
    return { tone: "needs-you", text: "Your plan is ready. Review it and approve to start the work.", action: { label: "Review plan", to: "/app/plan" } };
  }
  if (plan?.status === "changes_requested") return { tone: "info", text: "We're updating your plan with your feedback. We'll let you know when it's ready." };
  if (!plan && proposal?.status === "pending") {
    return { tone: "needs-you", text: "Your proposal is ready. Review it and approve to start the work.", action: { label: "Review proposal", to: "/app/proposal" } };
  }
  if (!plan && !proposal) return { tone: "info", text: "Thanks for filling in your brief. We're putting your plan together now." };
  if (toReview.length > 0) {
    return {
      tone: "needs-you",
      text: `${toReview.length} ${toReview.length === 1 ? "piece is" : "pieces are"} ready for your review.`,
      action: { label: "Review now", to: `?item=${toReview[0].id}` },
    };
  }
  return null;
}

function BannerBox({ banner }: { banner: Banner }) {
  const isNeedsYou = banner.tone === "needs-you";
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border px-5 py-4 mb-10 ${
        isNeedsYou ? "border-amber-400/40 bg-amber-400/10" : "border-blue-500/30 bg-blue-500/10"
      }`}
    >
      <p className="flex items-center gap-3 text-sm font-bold text-white">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isNeedsYou ? "bg-amber-400" : "bg-blue-500"}`} />
        {banner.text}
      </p>
      {banner.action && (
        <Link to={banner.action.to} className="btn-primary shrink-0 self-start sm:self-auto">
          {banner.action.label} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

const SETUP_STEPS = ["Tell us about your business", "Approve your plan", "We start making content"];

// Before any work exists: where the client is in getting started.
// Done = green, current = amber (it's on them) — the same colours as the lanes.
function SetupSteps({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
      {SETUP_STEPS.map((label, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        return (
          <li
            key={label}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
              isCurrent ? "border-amber-400/40 text-white font-bold" : "border-white/10 text-on-surface-variant"
            }`}
          >
            <span
              className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-amber-400 text-black" : "bg-white/10"
              }`}
            >
              {isDone ? "✓" : i + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function Lane({ stage, requests }: { stage: Request["stage"]; requests: Request[] }) {
  const [showAll, setShowAll] = useState(false);
  const style = STAGE_STYLE[stage];
  const isDelivered = stage === "delivered";
  const shown = isDelivered && !showAll ? requests.slice(0, DELIVERED_SHOWN) : requests;
  return (
    // "Needs your review" comes first on phones, where lanes stack.
    <section className={`min-w-0 ${stage === "review" ? "order-first xl:order-none" : ""}`}>
      <h3 className={`flex items-center gap-2 text-sm font-bold pb-2.5 mb-3 border-b-2 ${style.text} ${style.underline}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        {style.clientLabel}
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${style.tint}`}>{requests.length}</span>
      </h3>
      <div className="flex flex-col gap-2.5">
        {requests.length === 0 && <p className="text-xs text-on-surface-variant py-2">Nothing here right now.</p>}
        {shown.map((r) => (
          <RequestCard key={r.id} request={r} to={`?item=${r.id}`} highlightReview />
        ))}
        {isDelivered && requests.length > DELIVERED_SHOWN && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-bold text-on-surface-variant hover:text-white text-left py-1">
            {showAll ? "Show fewer" : `Show all ${requests.length}`}
          </button>
        )}
      </div>
    </section>
  );
}

// The client's whole dashboard on one page: what needs them, every piece
// of work by colour-coded stage (or on a calendar), what's left on their
// plan, and results once there are any. Pieces open in a side panel.
export default function DashboardHome() {
  const { orgId, orgName } = useOutletContext<ClientOutletContext>();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<HomeData | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const openId = params.get("item");
  const view = params.get("view") === "calendar" ? "calendar" : "board";

  // isRefresh: live updates reload quietly and keep what's on screen if they fail.
  const load = useCallback(
    async (isRefresh = false) => {
      const [onboardingRes, planRes, proposalRes, reportsRes, ledger] = await Promise.all([
        supabase.from("client_onboarding").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("plans").select("*").eq("org_id", orgId).neq("status", "superseded").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("proposals").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("performance_reports").select("*").eq("org_id", orgId).order("period_month", { ascending: true }),
        loadLedgerData(orgId),
      ]);
      if (onboardingRes.error || planRes.error || proposalRes.error || reportsRes.error || !ledger) {
        if (!isRefresh) setHasError(true);
        return;
      }
      setHasError(false);
      setData({
        onboarding: onboardingRes.data as ClientOnboarding | null,
        plan: planRes.data as Plan | null,
        proposal: proposalRes.data as Proposal | null,
        reports: (reportsRes.data ?? []) as PerformanceReport[],
        ledger,
      });
    },
    [orgId],
  );

  useEffect(() => {
    load();
  }, [load]);
  // Staff move work or deliver a file → the lanes move on their own.
  useLiveRefresh(["requests", "activity_events"], () => load(true), `org_id=eq.${orgId}`);

  const closeItem = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("item");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const setView = (next: "board" | "calendar") => setParams(next === "calendar" ? { view: "calendar" } : {}, { replace: true });

  if (hasError) return <ErrorBanner message="Couldn't load your dashboard. Try refreshing." />;
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const requests = data.ledger.requests;
  const byStage = (stage: Request["stage"]) => requests.filter((r) => r.stage === stage);
  const banner = nextStep(data, byStage("review"));
  const ledgerLines = computeLedger(data.ledger);
  const hasWork = requests.length > 0 || ledgerLines.length > 0;
  const isOnboarded = data.onboarding?.status === "submitted" || data.onboarding?.status === "reviewed";
  const isPlanApproved = data.plan?.status === "approved" || (!data.plan && data.proposal?.status === "approved");
  const setupStep = !isOnboarded ? 0 : !isPlanApproved ? 1 : 2;
  const approvedPlanPath =
    data.plan?.status === "approved" ? "/app/plan" : !data.plan && data.proposal?.status === "approved" ? "/app/proposal" : null;
  const itemLink = (id: string) => (view === "calendar" ? `?view=calendar&item=${id}` : `?item=${id}`);

  return (
    <div>
      <PageHeader
        title={orgName || "Your dashboard"}
        description="Everything we're making for you, in one place."
        action={
          hasWork &&
          profile &&
          !isFormOpen && (
            <button type="button" onClick={() => setIsFormOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> New request
            </button>
          )
        }
      />

      {banner && <BannerBox banner={banner} />}
      {!hasWork && <SetupSteps current={setupStep} />}

      {isFormOpen && profile && (
        <NewRequestForm
          orgId={orgId}
          profileId={profile.id}
          onCancel={() => setIsFormOpen(false)}
          onCreated={() => {
            setIsFormOpen(false);
            load(true);
          }}
        />
      )}

      {hasWork && (
        <section className="mb-14">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="font-bold text-white text-lg">Your content</h2>
            <div className="inline-flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="View">
              {(
                [
                  ["board", "Board", Columns3],
                  ["calendar", "Calendar", CalendarDays],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    view === key ? "bg-white/10 text-white" : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {view === "board" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-10">
              {REQUEST_STAGES.map(({ value }) => (
                <Lane key={value} stage={value} requests={byStage(value)} />
              ))}
            </div>
          ) : (
            <ContentCalendar requests={requests} linkFor={itemLink} />
          )}
        </section>
      )}

      {(ledgerLines.length > 0 || approvedPlanPath) && (
        <section className="mb-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-5">
            <h2 className="font-bold text-white text-lg">Your plan</h2>
            <span className="flex gap-4 text-xs font-bold">
              {approvedPlanPath && (
                <Link to={approvedPlanPath} className="text-primary hover:underline">
                  What's in your plan &rarr;
                </Link>
              )}
              <Link to="/app/account#billing" className="text-primary hover:underline">
                Billing and receipts &rarr;
              </Link>
            </span>
          </div>
          {ledgerLines.length > 0 ? (
            <LedgerLines lines={ledgerLines} />
          ) : (
            <p className="text-sm text-on-surface-variant">Usage shows here once your first order goes through.</p>
          )}
        </section>
      )}

      {data.reports.length > 0 && (
        <section id="results" className="mb-14">
          <h2 className="font-bold text-white text-lg mb-5">Results</h2>
          <ResultsView reports={data.reports} />
        </section>
      )}

      {openId && <RequestDrawer id={openId} onClose={closeItem} onChanged={() => load(true)} />}
    </div>
  );
}
