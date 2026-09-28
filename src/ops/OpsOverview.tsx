import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import { formatCents, formatDate, localDateString } from "../lib/format";
import PageHeader from "../components/workspace/PageHeader";
import StatStrip from "../components/workspace/StatStrip";
import type { ClientOnboarding, ContactSubmission, Organization, Payment, Plan, Request } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

const DUE_SOON_DAYS = 7;

type OverviewData = {
  orgs: Organization[];
  requests: Request[];
  onboardings: ClientOnboarding[];
  plans: Plan[];
  leads: ContactSubmission[];
  payments: Payment[];
};

function Panel({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-bold text-white mb-2">
        {title}
        <span className="text-xs font-normal text-on-surface-variant">{count}</span>
      </h2>
      <ul className="divide-y divide-white/10 border-y border-white/10">{children}</ul>
    </section>
  );
}

function Row({ to, title, meta }: { to: string; title: string; meta: string }) {
  return (
    <li>
      <Link to={to} className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-3 py-3 group">
        <span className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{title}</span>
        <span className="flex items-center gap-1 text-xs text-on-surface-variant sm:shrink-0">
          {meta} <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    </li>
  );
}

// The owner's "what needs me today" screen: every list here is something a
// person on the team has to act on, not a vanity chart.
export default function OpsOverview() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      supabase.from("organizations").select("*"),
      supabase.from("requests").select("*").neq("stage", "delivered"),
      supabase.from("client_onboarding").select("*").eq("status", "submitted"),
      supabase.from("plans").select("*").neq("status", "superseded"),
      supabase.from("contact_submissions").select("*").eq("status", "new").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("status", "succeeded"),
    ]).then((results) => {
      if (!isMounted) return;
      if (results.some((r) => r.error)) {
        setState("error");
        return;
      }
      const [orgs, requests, onboardings, plans, leads, payments] = results.map((r) => r.data ?? []);
      setData({
        orgs: orgs as Organization[],
        requests: requests as Request[],
        onboardings: onboardings as ClientOnboarding[],
        plans: plans as Plan[],
        leads: leads as ContactSubmission[],
        payments: payments as Payment[],
      });
      setState("ready");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div>
        <ErrorBanner message="Couldn't load the overview. Try refreshing." />
      </div>
    );
  }

  const { orgs, requests, onboardings, plans, leads, payments } = data;
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "Unknown client";
  const today = localDateString();
  const soon = localDateString(new Date(Date.now() + DUE_SOON_DAYS * 86400000));
  const overdue = requests.filter((r) => r.due_date && r.due_date < today);
  const dueSoon = requests.filter((r) => r.due_date && r.due_date >= today && r.due_date <= soon);
  const unassigned = requests.filter((r) => !r.assigned_to);
  const changesRequested = plans.filter((p) => p.status === "changes_requested");
  const awaitingClient = plans.filter((p) => p.status === "sent" || p.status === "viewed");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const paidThisMonth = payments.filter((p) => p.created_at >= monthStart).reduce((sum, p) => sum + p.amount, 0);

  const panels = [
    {
      title: "Overdue",
      rows: overdue.map((r) => (
        <Row key={r.id} to={`/ops/requests/${r.id}`} title={r.title} meta={`${orgName(r.org_id)} · was due ${formatDate(r.due_date)}`} />
      )),
    },
    {
      title: `Due in the next ${DUE_SOON_DAYS} days`,
      rows: dueSoon.map((r) => (
        <Row key={r.id} to={`/ops/requests/${r.id}`} title={r.title} meta={`${orgName(r.org_id)} · ${formatDate(r.due_date)}`} />
      )),
    },
    {
      title: "Plans with change requests",
      rows: changesRequested.map((p) => (
        <Row key={p.id} to={`/ops/admin/plans?org=${p.org_id}`} title={orgName(p.org_id)} meta={`v${p.version} · revise`} />
      )),
    },
    {
      title: "Onboarding to review",
      rows: onboardings.map((o) => (
        <Row key={o.id} to="/ops/onboarding" title={orgName(o.org_id)} meta={`submitted ${formatDate(o.submitted_at)}`} />
      )),
    },
    {
      title: "Unassigned work",
      rows: unassigned.map((r) => <Row key={r.id} to={`/ops/requests/${r.id}`} title={r.title} meta={orgName(r.org_id)} />),
    },
    {
      title: "Plans waiting on the client",
      rows: awaitingClient.map((p) => (
        <Row key={p.id} to={`/ops/clients/${p.org_id}`} title={orgName(p.org_id)} meta={`sent ${formatDate(p.sent_at)}`} />
      )),
    },
  ];
  // Only what needs attention gets a panel; the rest is one quiet line.
  const active = panels.filter((p) => p.rows.length > 0);
  const clear = panels.filter((p) => p.rows.length === 0).map((p) => p.title.toLowerCase());

  return (
    <div>
      <PageHeader title="Overview" description="Everything that needs someone on the team today." />

      <StatStrip
        stats={[
          { label: "Active clients", value: <Link to="/ops/clients" className="hover:text-primary">{orgs.filter((o) => o.status === "active").length}</Link> },
          { label: "Open requests", value: <Link to="/ops/board" className="hover:text-primary">{requests.length}</Link> },
          { label: "New leads", value: <Link to="/ops/leads" className="hover:text-primary">{leads.length}</Link>, isAccent: leads.length > 0 },
          { label: "Paid this month", value: formatCents(paidThisMonth) },
        ]}
      />

      {active.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 mb-10">
          {active.map((p) => (
            <Panel key={p.title} title={p.title} count={p.rows.length}>
              {p.rows}
            </Panel>
          ))}
        </div>
      )}
      {clear.length > 0 && (
        <p className="text-sm text-on-surface-variant">
          <span className="text-emerald-400 light:text-emerald-700 font-bold">All clear:</span> {clear.join(", ")}.
        </p>
      )}
    </div>
  );
}
