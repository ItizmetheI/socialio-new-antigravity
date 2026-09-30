import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { TONE_ORDER, TONE_STYLE, buildAttention, type AttentionTone } from "./attention";
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
const LIST_LIMIT = 12;

// Today: one list of everything someone on the team should deal with,
// colour-tagged and most urgent first, then who's carrying what.
export default function OpsOverview() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<OverviewData | null>(null);
  const [toneFilter, setToneFilter] = useState<AttentionTone | "all">("all");
  const [showAll, setShowAll] = useState(false);

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
    return <ErrorBanner message="Couldn't load today's list. Try refreshing." />;
  }

  const { orgs, requests, onboardings, plans, leads, payments, subscriptions, orders, orderItems, comments, profiles } = data;
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "Unknown client";
  const today = localDateString();
  const items = buildAttention({
    openRequests: requests,
    onboardings,
    plans,
    newLeads: leads,
    comments,
    profiles,
    orgName,
    today,
    soon: localDateString(new Date(Date.now() + DUE_SOON_DAYS * 86400000)),
    formatDate,
    timeAgo,
  });
  const count = (tone: AttentionTone) => items.filter((i) => i.tone === tone).length;
  const filtered = toneFilter === "all" ? items : items.filter((i) => i.tone === toneFilter);
  const shown = showAll ? filtered : filtered.slice(0, LIST_LIMIT);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const paidThisMonth = payments.filter((p) => p.created_at >= monthStart).reduce((sum, p) => sum + p.amount, 0);
  const mrr = mrrCents(orders, orderItems, subscriptions);

  // Who's carrying what.
  const staff = profiles.filter((p) => (p.role === "internal" || p.role === "admin") && p.is_active !== false);
  const workload = staff
    .map((m) => ({
      member: m,
      open: requests.filter((r) => r.assigned_to === m.id).length,
      // Same rule as the list: a piece with the client for review isn't late on us.
      late: requests.filter((r) => r.assigned_to === m.id && r.stage !== "review" && r.due_date && r.due_date < today).length,
    }))
    .sort((a, b) => b.open - a.open);

  return (
    <div>
      <PageHeader title="Today" description="What needs the team, most urgent first. Tap anything to deal with it." />

      <StatStrip
        stats={[
          {
            label: "Monthly recurring",
            value: formatCents(mrr),
            detail: <span className="text-on-surface-variant">{orgs.filter((o) => o.status === "active").length} active clients</span>,
          },
          { label: "Paid this month", value: formatCents(paidThisMonth) },
          { label: "Open work", value: <Link to="/ops/work" className="hover:text-primary">{requests.length}</Link> },
          { label: "New leads", value: <Link to="/ops/leads" className="hover:text-primary">{leads.length}</Link>, isAccent: leads.length > 0 },
        ]}
      />

      <section className="mb-14">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 mb-4" role="group" aria-label="Filter">
          {(["all", ...TONE_ORDER] as const).map((tone) => {
            const isActive = toneFilter === tone;
            const n = tone === "all" ? items.length : count(tone);
            return (
              <button
                key={tone}
                type="button"
                onClick={() => {
                  setToneFilter(tone);
                  setShowAll(false);
                }}
                aria-pressed={isActive}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  isActive ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-on-surface-variant hover:text-white"
                }`}
              >
                {tone !== "all" && <span className={`w-2 h-2 rounded-full ${TONE_STYLE[tone].dot}`} />}
                {tone === "all" ? "Everything" : TONE_STYLE[tone].label}
                <span className="font-normal opacity-70">{n}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm font-bold text-white flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> All caught up. Nothing here needs anyone right now.
          </div>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {shown.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="flex items-center gap-3 py-3.5 group">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TONE_STYLE[item.tone].dot}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold text-white group-hover:text-primary transition-colors break-words">{item.title}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TONE_STYLE[item.tone].chip}`}>{item.tag}</span>
                    </span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">{item.meta}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > LIST_LIMIT && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs font-bold text-on-surface-variant hover:text-white">
            {showAll ? "Show fewer" : `Show all ${filtered.length}`}
          </button>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-12 gap-y-12">
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
                    {open} open{late > 0 && <span className="text-red-400 light:text-red-600 font-bold"> · {late} overdue</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-bold text-white mb-2">Live activity</h2>
          <ActivityFeed linkFor={(id) => `/ops/work?item=${id}`} orgNameById={orgNameById} limit={10} emptyText="Activity across all clients shows up here." />
        </section>
      </div>
    </div>
  );
}
