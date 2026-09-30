import { supabase } from "../../../lib/supabase";
import { computeLedger, type LedgerLine } from "../../../components/workspace/LedgerData";
import type {
  ActivityEvent,
  ClientOnboarding,
  ContactSubmission,
  Order,
  OrderItem,
  Organization,
  Payment,
  Plan,
  Request,
  Subscription,
} from "../../../lib/database.types";

// One row of admin_user_directory() (schema_admin_directory.sql).
export type DirectoryUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  org_id: string | null;
  is_active: boolean;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  providers: string[];
};

export type DeliverableStub = { id: string; request_id: string; created_at: string };

export type EverythingData = {
  orgs: Organization[];
  requests: Request[];
  plans: Plan[];
  orders: Order[];
  orderItems: OrderItem[];
  subscriptions: Subscription[];
  payments: Payment[];
  activity: ActivityEvent[];
  onboardings: ClientOnboarding[];
  brandKitOrgIds: Set<string>;
  deliverables: DeliverableStub[];
  leads: ContactSubmission[];
  newsletterCount: number;
  users: DirectoryUser[];
};

const ACTIVITY_LIMIT = 1000;

// Everything the admin page shows, in one parallel round-trip. Staff RLS
// already allows reading all of these; the account directory is admin-only
// (the function itself refuses anyone else).
// ponytail: one unpaginated read per table; the API caps each at 1000 rows,
// so paginate (or move the tallies into SQL) once any table passes that.
export async function loadEverything(): Promise<EverythingData> {
  const results = await Promise.all([
    supabase.from("organizations").select("*").order("created_at", { ascending: false }),
    supabase.from("requests").select("*"),
    supabase.from("plans").select("*").neq("status", "superseded"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("order_items").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
    supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(ACTIVITY_LIMIT),
    supabase.from("client_onboarding").select("*"),
    supabase.from("brand_kits").select("org_id"),
    supabase.from("deliverables").select("id, request_id, created_at"),
    supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
    supabase.from("newsletter_signups").select("id"),
    supabase.rpc("admin_user_directory"),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  const [orgs, requests, plans, orders, orderItems, subscriptions, payments, activity, onboardings, kits, deliverables, leads, newsletter, users] =
    results.map((r) => (r.data ?? []) as unknown[]);
  return {
    orgs: orgs as Organization[],
    requests: requests as Request[],
    plans: plans as Plan[],
    orders: orders as Order[],
    orderItems: orderItems as OrderItem[],
    subscriptions: subscriptions as Subscription[],
    payments: payments as Payment[],
    activity: activity as ActivityEvent[],
    onboardings: onboardings as ClientOnboarding[],
    brandKitOrgIds: new Set((kits as { org_id: string }[]).map((k) => k.org_id)),
    deliverables: deliverables as DeliverableStub[],
    leads: leads as ContactSubmission[],
    newsletterCount: newsletter.length,
    users: users as DirectoryUser[],
  };
}

export type TimelineEntry = {
  id: string;
  at: string;
  orgId: string | null;
  type: "account" | "checkout" | "onboarding" | "work" | "money" | "plan" | "lead";
  text: string;
  link?: string;
  isInternal?: boolean;
};

const ACTIVITY_TYPE: Record<ActivityEvent["kind"], TimelineEntry["type"]> = {
  request_created: "work",
  stage_changed: "work",
  comment_added: "work",
  file_delivered: "work",
  plan_sent: "plan",
  plan_approved: "plan",
  plan_changes_requested: "plan",
  payment_received: "money",
};

// Every "who did what, when" source merged into one newest-first list:
// trigger-written activity, account sign-ups, checkouts, onboarding, leads.
export function buildTimeline(d: EverythingData, formatMoney: (cents: number, currency: string) => string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const e of d.activity) {
    entries.push({
      id: `a-${e.id}`,
      at: e.created_at,
      orgId: e.org_id,
      type: ACTIVITY_TYPE[e.kind] ?? "work",
      text: e.summary,
      link: e.request_id ? `/ops/work?item=${e.request_id}` : undefined,
      isInternal: e.is_internal,
    });
  }
  for (const u of d.users) {
    const who = u.full_name || u.email || "Someone";
    const how = u.providers.includes("google") ? " with Google" : "";
    entries.push({ id: `u-${u.id}`, at: u.created_at, orgId: u.org_id, type: "account", text: `${who} created an account${how} (${u.role})` });
  }
  for (const o of d.orders) {
    const amount = formatMoney(o.amount_total, o.currency);
    const text =
      o.status === "paid" ? `Paid ${amount} at checkout` : o.status === "pending" ? `Opened a ${amount} checkout and hasn't paid` : `${amount} checkout ${o.status}`;
    entries.push({ id: `o-${o.id}`, at: o.created_at, orgId: o.org_id, type: "checkout", text });
  }
  for (const ob of d.onboardings) {
    if (ob.submitted_at) entries.push({ id: `ob-${ob.id}`, at: ob.submitted_at, orgId: ob.org_id, type: "onboarding", text: "Submitted their onboarding questionnaire" });
  }
  for (const l of d.leads) {
    entries.push({ id: `l-${l.id}`, at: l.created_at, orgId: null, type: "lead", text: `New lead: ${l.name}${l.company ? ` (${l.company})` : ""}`, link: "/ops/leads" });
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

const LIVE_SUBSCRIPTION = ["active", "trialing", "past_due"];

// Monthly recurring revenue: the monthly lines of every paid order whose
// subscription is still live.
export function mrrCents(orders: Order[], items: OrderItem[], subscriptions: Subscription[]) {
  const liveSubs = new Set(subscriptions.filter((s) => LIVE_SUBSCRIPTION.includes(s.status)).map((s) => s.stripe_subscription_id));
  const liveOrderIds = new Set(orders.filter((o) => o.status === "paid" && o.stripe_subscription_id && liveSubs.has(o.stripe_subscription_id)).map((o) => o.id));
  return items
    .filter((i) => i.billing_interval === "month" && liveOrderIds.has(i.order_id))
    .reduce((sum, i) => sum + i.unit_amount * i.quantity, 0);
}

export type ClientSummary = {
  org: Organization;
  people: DirectoryUser[];
  lastSignIn: string | null;
  paidCents: number;
  mrrCents: number;
  pendingCheckouts: number;
  ledger: LedgerLine[];
  unitsBought: number;
  unitsDelivered: number;
  unitsRemaining: number;
  openWork: number;
  inReview: number;
  deliveredWork: number;
  files: number;
  plan: Plan | null;
  onboarding: ClientOnboarding | null;
  hasBrandKit: boolean;
  history: TimelineEntry[];
};

// Everything the admin needs about one client, computed from the page's
// single load (no per-client queries).
export function summarizeClients(d: EverythingData, timeline: TimelineEntry[], now = new Date()): ClientSummary[] {
  return d.orgs.map((org) => {
    const mine = <T extends { org_id: string | null }>(rows: T[]) => rows.filter((r) => r.org_id === org.id);
    const orders = mine(d.orders);
    const orderIds = new Set(orders.map((o) => o.id));
    const items = d.orderItems.filter((i) => orderIds.has(i.order_id));
    const subscriptions = mine(d.subscriptions);
    const requests = mine(d.requests);
    const requestIds = new Set(requests.map((r) => r.id));
    const ledger = computeLedger({ orders, items, subscriptions, payments: mine(d.payments), requests }, now);
    const people = mine(d.users);
    const signIns = people.map((p) => p.last_sign_in_at).filter((t): t is string => !!t).sort();
    const plans = mine(d.plans).sort((a, b) => b.version - a.version);
    return {
      org,
      people,
      lastSignIn: signIns.at(-1) ?? null,
      paidCents: mine(d.payments).filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0),
      mrrCents: mrrCents(orders, items, subscriptions),
      pendingCheckouts: orders.filter((o) => o.status === "pending").length,
      ledger,
      unitsBought: ledger.reduce((sum, l) => sum + l.units, 0),
      unitsDelivered: ledger.reduce((sum, l) => sum + l.delivered, 0),
      unitsRemaining: ledger.reduce((sum, l) => sum + l.remaining, 0),
      openWork: requests.filter((r) => r.stage !== "delivered").length,
      inReview: requests.filter((r) => r.stage === "review").length,
      deliveredWork: requests.filter((r) => r.stage === "delivered").length,
      files: d.deliverables.filter((f) => requestIds.has(f.request_id)).length,
      plan: plans[0] ?? null,
      onboarding: mine(d.onboardings)[0] ?? null,
      hasBrandKit: d.brandKitOrgIds.has(org.id),
      history: timeline.filter((t) => t.orgId === org.id),
    };
  });
}
