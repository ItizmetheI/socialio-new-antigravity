import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import { formatCents, formatDate, localDateString, timeAgo } from "../lib/format";
import ActivityFeed from "../components/workspace/ActivityFeed";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import PageHeader from "../components/workspace/PageHeader";
import StatStrip from "../components/workspace/StatStrip";
import { mrrCents } from "./admin/everything/loadEverything";
import type { ClientOnboarding, Comment, ContactSubmission, Order, OrderItem, Organization, Payment, Plan, Profile, Request, Subscription } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

const DUE_SOON_DAYS = 7;

type OverviewData = {
  orgs: Organization[];
  requests: Request[];
  onboardings: ClientOnboarding[];
  plans: Plan[];
  leads: ContactSubmission[];
  payments: Payment[];
  subscriptions: Subscription[];
  orders: Order[];
  orderItems: OrderItem[];
  comments: Comment[];
  profiles: Profile[];
};

const REPLY_WINDOW_DAYS = 30;

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

  // isRefresh: live updates reload quietly, no spinner.
  const load = useCallback(async (isRefresh = false) => {
    const since = new Date(Date.now() - REPLY_WINDOW_DAYS * 86400000).toISOString();
    const results = await Promise.all([
      supabase.from("organizations").select("*"),
      supabase.from("requests").select("*").neq("stage", "delivered"),
      supabase.from("client_onboarding").select("*").eq("status", "submitted"),
      supabase.from("plans").select("*").neq("status", "superseded"),
      supabase.from("contact_submissions").select("*").eq("status", "new").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("status", "succeeded"),
      supabase.from("subscriptions").select("*"),
      supabase.from("orders").select("*").eq("status", "paid"),
      supabase.from("order_items").select("*").eq("billing_interval", "month"),
      supabase.from("comments").select("*").gte("created_at", since).order("created_at", { ascending: true }),
      supabase.from("profiles").select("*"),
    ]);
    if (results.some((r) => r.error)) {
      if (!isRefresh) setState("error");
      return;
    }
    const [orgs, requests, onboardings, plans, leads, payments, subscriptions, orders, orderItems, comments, profiles] = results.map((r) => r.data ?? []);
    setData({
      orgs: orgs as Organization[],
      requests: requests as Request[],
      onboardings: onboardings as ClientOnboarding[],
      plans: plans as Plan[],
      leads: leads as ContactSubmission[],
      payments: payments as Payment[],
      subscriptions: subscriptions as Subscription[],
      orders: orders as Order[],
      orderItems: orderItems as OrderItem[],
      comments: comments as Comment[],
      profiles: profiles as Profile[],
    });
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(["requests", "comments", "activity_events"], () => load(true));
  const orgNameById = useMemo(() => new Map((data?.orgs ?? []).map((o) => [o.id, o.name])), [data]);

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

  const { orgs, requests, onboardings, plans, leads, payments, subscriptions, orders, orderItems, comments, profiles } = data;
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

  const mrr = mrrCents(orders, orderItems, subscriptions);

  // A request needs a reply when its latest comment came from the client.
  const roleById = new Map(profiles.map((p) => [p.id, p.role]));
  const latestByRequest = new Map<string, Comment>();
  comments.forEach((c) => latestByRequest.set(c.request_id, c));
  const openById = new Map(requests.map((r) => [r.id, r]));
  const awaitingReply = [...latestByRequest.values()]
    .filter((c) => roleById.get(c.author_id) === "client" && openById.has(c.request_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Who's carrying what.
  const staff = profiles.filter((p) => (p.role === "internal" || p.role === "admin") && p.is_active !== false);
  const workload = staff
    .map((m) => ({
      member: m,
      open: requests.filter((r) => r.assigned_to === m.id).length,
      late: requests.filter((r) => r.assigned_to === m.id && r.due_date && r.due_date < today).length,
    }))
    .sort((a, b) => b.open - a.open);

  const panels = [
    {
      title: "Clients waiting on a reply",
      rows: awaitingReply.map((c) => {
        const r = openById.get(c.request_id)!;
        return <Row key={c.id} to={`/ops/requests/${r.id}`} title={r.title} meta={`${orgName(r.org_id)} · ${timeAgo(c.created_at)}`} />;
      }),
    },
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
          {
            label: "Monthly recurring",
            value: formatCents(mrr),
            detail: <span className="text-on-surface-variant">{orgs.filter((o) => o.status === "active").length} active clients</span>,
          },
          { label: "Paid this month", value: formatCents(paidThisMonth) },
          { label: "Open work", value: <Link to="/ops/board" className="hover:text-primary">{requests.length}</Link> },
          { label: "New leads", value: <Link to="/ops/leads" className="hover:text-primary">{leads.length}</Link>, isAccent: leads.length > 0 },
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-12 gap-y-10 mt-12">
        <section>
          <h2 className="font-bold text-white mb-2">Team workload</h2>
          {workload.length === 0 ? (
            <p className="text-sm text-on-surface-variant border-y border-white/10 py-3.5">No teammates yet.</p>
          ) : (
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {workload.map(({ member, open, late }) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm font-bold text-white truncate min-w-0">{member.full_name ?? "Unnamed teammate"}</span>
                  <span className="text-xs text-on-surface-variant shrink-0">
                    {open} open{late > 0 && <span className="text-error font-bold"> · {late} overdue</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-bold text-white mb-2">Live activity</h2>
          <ActivityFeed linkFor={(id) => `/ops/requests/${id}`} orgNameById={orgNameById} limit={15} emptyText="Activity across all clients shows up here." />
        </section>
      </div>
    </div>
  );
}
