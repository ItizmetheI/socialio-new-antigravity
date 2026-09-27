import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import { formatCents, formatDate, localDateString } from "../lib/format";
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

function Tile({ label, value, to }: { label: string; value: string; to?: string }) {
  const body = (
    <>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">{label}</div>
    </>
  );
  const className = "bg-surface-container border border-white/10 rounded-2xl p-6 transition-colors";
  return to ? (
    <Link to={to} className={`${className} hover:border-primary/30`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Panel({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="bg-surface-container border border-white/10 rounded-3xl p-6">
      <h2 className="font-bold text-white mb-4">
        {title} <span className="text-on-surface-variant font-medium">({count})</span>
      </h2>
      {count === 0 ? <p className="text-sm text-on-surface-variant">Nothing here — all clear.</p> : children}
    </section>
  );
}

function Row({ to, title, meta }: { to: string; title: string; meta: string }) {
  return (
    <Link to={to} className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
      <span className="text-sm font-bold text-white truncate">{title}</span>
      <span className="flex items-center gap-1 text-xs text-on-surface-variant sm:shrink-0">
        {meta} <ArrowUpRight className="w-3.5 h-3.5" />
      </span>
    </Link>
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
      <div className="p-5 md:p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div className="p-5 md:p-10">
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

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Tile label="Active clients" value={String(orgs.filter((o) => o.status === "active").length)} to="/ops/clients" />
        <Tile label="Open requests" value={String(requests.length)} to="/ops/board" />
        <Tile label="New leads" value={String(leads.length)} to="/ops/leads" />
        <Tile label="Paid this month" value={formatCents(paidThisMonth)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Overdue" count={overdue.length}>
          {overdue.map((r) => (
            <Row key={r.id} to={`/ops/requests/${r.id}`} title={r.title} meta={`${orgName(r.org_id)} · was due ${formatDate(r.due_date)}`} />
          ))}
        </Panel>
        <Panel title={`Due in the next ${DUE_SOON_DAYS} days`} count={dueSoon.length}>
          {dueSoon.map((r) => (
            <Row key={r.id} to={`/ops/requests/${r.id}`} title={r.title} meta={`${orgName(r.org_id)} · ${formatDate(r.due_date)}`} />
          ))}
        </Panel>
        <Panel title="Plans with change requests" count={changesRequested.length}>
          {changesRequested.map((p) => (
            <Row key={p.id} to={`/ops/admin/plans?org=${p.org_id}`} title={orgName(p.org_id)} meta={`v${p.version} · revise`} />
          ))}
        </Panel>
        <Panel title="Onboarding to review" count={onboardings.length}>
          {onboardings.map((o) => (
            <Row key={o.id} to="/ops/onboarding" title={orgName(o.org_id)} meta={`submitted ${formatDate(o.submitted_at)}`} />
          ))}
        </Panel>
        <Panel title="Unassigned work" count={unassigned.length}>
          {unassigned.map((r) => (
            <Row key={r.id} to={`/ops/requests/${r.id}`} title={r.title} meta={orgName(r.org_id)} />
          ))}
        </Panel>
        <Panel title="Plans waiting on the client" count={awaitingClient.length}>
          {awaitingClient.map((p) => (
            <Row key={p.id} to={`/ops/clients/${p.org_id}`} title={orgName(p.org_id)} meta={`sent ${formatDate(p.sent_at)}`} />
          ))}
        </Panel>
      </div>
    </div>
  );
}
