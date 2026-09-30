import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Spinner from "../../../components/Spinner";
import ErrorBanner from "../../../components/ErrorBanner";
import PageHeader from "../../../components/workspace/PageHeader";
import StatStrip from "../../../components/workspace/StatStrip";
import { formatCents, timeAgo } from "../../../lib/format";
import { useLiveRefresh } from "../../../lib/useLiveRefresh";
import { buildTimeline, loadEverything, mrrCents, summarizeClients, type EverythingData } from "./loadEverything";
import ClientsView from "./ClientsView";
import TimelineView from "./TimelineView";
import MoneyView from "./MoneyView";
import AccountsView from "./AccountsView";
import UsersAdmin from "../UsersAdmin";

const VIEWS = [
  { key: "clients", label: "Clients" },
  { key: "timeline", label: "Timeline" },
  { key: "money", label: "Money" },
  { key: "accounts", label: "Accounts" },
  { key: "team", label: "Team" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

// Admin-only: every client, account, checkout, payment and action on the
// site in one place, kept live. The route and the account directory RPC are
// both admin-gated (the RPC refuses non-admins server-side).
export default function EverythingPage() {
  const [data, setData] = useState<EverythingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [params, setParams] = useSearchParams();
  const view: ViewKey = VIEWS.some((v) => v.key === params.get("view")) ? (params.get("view") as ViewKey) : "clients";

  // isRefresh: a live update keeps what's on screen if the reload fails.
  const load = useCallback(async (isRefresh = false) => {
    try {
      setData(await loadEverything());
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (!isRefresh) setError(err instanceof Error ? err.message : "Couldn't load.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(["activity_events", "requests", "comments", "deliverables"], () => load(true));

  const timeline = useMemo(() => (data ? buildTimeline(data, formatCents) : []), [data]);
  const clients = useMemo(() => (data ? summarizeClients(data, timeline) : []), [data, timeline]);

  if (error) return <ErrorBanner message={`Couldn't load everything: ${error}`} />;
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const collected = data.payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);
  const paying = clients.filter((c) => c.paidCents > 0).length;
  const delivered = data.requests.filter((r) => r.stage === "delivered").length;
  const unpaidCheckouts = data.orders.filter((o) => o.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Every client, account, payment and action on the site, plus your team. Updates live."
        action={updatedAt && <span className="text-xs text-on-surface-variant">Updated {timeAgo(updatedAt.toISOString())}</span>}
      />

      <StatStrip
        stats={[
          {
            label: "Collected, all time",
            value: formatCents(collected),
            detail: <span className="text-on-surface-variant">{formatCents(mrrCents(data.orders, data.orderItems, data.subscriptions))}/mo recurring</span>,
          },
          {
            label: "Clients",
            value: data.orgs.length,
            detail: (
              <span className="text-on-surface-variant">
                {paying} paying · {unpaidCheckouts} unpaid checkout{unpaidCheckouts === 1 ? "" : "s"}
              </span>
            ),
          },
          {
            label: "Accounts",
            value: data.users.length,
            detail: <span className="text-on-surface-variant">{data.leads.length} leads · {data.newsletterCount} newsletter</span>,
          },
          {
            label: "Requests delivered",
            value: delivered,
            detail: <span className="text-on-surface-variant">{data.requests.length - delivered} open · {data.deliverables.length} files</span>,
          },
        ]}
      />

      <div role="tablist" aria-label="Sections" className="flex border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setParams(v.key === "clients" ? {} : { view: v.key }, { replace: true })}
            className={`px-3 py-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors first:pl-0 ${
              view === v.key ? "border-primary text-white font-bold" : "border-transparent text-on-surface-variant hover:text-white"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "clients" && <ClientsView clients={clients} />}
      {view === "timeline" && <TimelineView entries={timeline} orgs={data.orgs} />}
      {view === "money" && <MoneyView orders={data.orders} orderItems={data.orderItems} payments={data.payments} orgs={data.orgs} />}
      {view === "accounts" && <AccountsView users={data.users} orgs={data.orgs} />}
      {view === "team" && <UsersAdmin />}

      <p className="text-xs text-on-surface-variant mt-16">
        Older clients from before plans existed use proposals:{" "}
        <Link to="/ops/admin/proposals" className="text-primary hover:underline">
          legacy proposals
        </Link>
        .
      </p>
    </div>
  );
}
