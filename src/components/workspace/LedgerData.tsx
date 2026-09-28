// The order ledger: per purchased line, what's been used this billing period
// and what's left. Computed in the browser from tables that already have
// org-scoped RLS (see supabase/schema_ledger.sql), so a client can only ever
// tally their own purchases.
import { supabase } from "../../lib/supabase";
import { addOnsData, servicesData } from "../../data/services";
import type { Order, OrderItem, Payment, Request, Subscription } from "../../lib/database.types";

export type LedgerData = {
  orders: Order[];
  items: OrderItem[];
  subscriptions: Subscription[];
  payments: Payment[];
  requests: Request[];
};

export type LedgerLine = {
  item: OrderItem;
  title: string;
  units: number;
  priceCents: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date | null; // null for one-time lines
  delivered: number;
  inProgress: number; // in_progress + review
  requested: number;
  remaining: number;
  over: number; // units committed beyond what was bought
  valueRemainingCents: number;
};

export const lineTitle = (serviceId: string) =>
  servicesData.find((s) => s.id === serviceId)?.title ?? addOnsData.find((a) => a.id === serviceId)?.title ?? serviceId;

// order_items.units is written by checkout; older rows fall back to the number
// in the tier label ("10 Posts" -> 10), else 1 ("Monthly", "One-time").
export function unitsOf(item: OrderItem) {
  const perItem = item.units ?? Number(item.tier_label.match(/\d+/)?.[0] ?? 1);
  return perItem * item.quantity;
}

// Calendar-month step in UTC, clamped to the target month's last day the way
// Stripe anchors billing (Jan 31 + 1 month = Feb 28, not Mar 3).
export function addMonths(date: Date, months: number) {
  const day = date.getUTCDate();
  const result = new Date(date);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// Monthly lines reset each billing period: the subscription's period end
// minus one month, or — before the subscription webhook has landed — the
// purchase date rolled forward to the latest monthly anniversary.
function currentPeriod(order: Order, item: OrderItem, subscriptions: Subscription[], now: Date) {
  const bought = new Date(order.paid_at ?? order.created_at);
  if (item.billing_interval === "one_time") return { start: bought, end: null };
  const sub = subscriptions.find((s) => order.stripe_subscription_id && s.stripe_subscription_id === order.stripe_subscription_id);
  if (sub?.current_period_end) {
    const end = new Date(sub.current_period_end);
    return { start: addMonths(end, -1), end };
  }
  let months = 0;
  while (addMonths(bought, months + 1) <= now) months += 1;
  return { start: addMonths(bought, months), end: addMonths(bought, months + 1) };
}

// A request counts against the period it was created in.
export function computeLedger(data: LedgerData, now = new Date()): LedgerLine[] {
  const paid = data.orders.filter((o) => o.status === "paid");
  return paid.flatMap((order) =>
    data.items
      .filter((item) => item.order_id === order.id)
      .map((item) => {
        const units = unitsOf(item);
        const priceCents = item.unit_amount * item.quantity;
        const period = currentPeriod(order, item, data.subscriptions, now);
        const drawn = data.requests.filter((r) => r.order_item_id === item.id && new Date(r.created_at) >= period.start);
        const sum = (stages: Request["stage"][]) =>
          drawn.filter((r) => stages.includes(r.stage)).reduce((total, r) => total + (r.units ?? 1), 0);
        const delivered = sum(["delivered"]);
        const inProgress = sum(["in_progress", "review"]);
        const requested = sum(["requested"]);
        const used = delivered + inProgress + requested;
        const remaining = Math.max(0, units - used);
        return {
          item,
          title: lineTitle(item.service_id),
          units,
          priceCents,
          currency: order.currency,
          periodStart: period.start,
          periodEnd: period.end,
          delivered,
          inProgress,
          requested,
          remaining,
          over: Math.max(0, used - units),
          valueRemainingCents: Math.round((priceCents * remaining) / units),
        };
      }),
  );
}

export async function loadLedgerData(orgId: string): Promise<LedgerData | null> {
  const [ordersRes, subsRes, paymentsRes, requestsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*").eq("org_id", orgId),
    supabase.from("payments").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("requests").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
  ]);
  if (ordersRes.error || subsRes.error || paymentsRes.error || requestsRes.error) return null;
  const orders = (ordersRes.data ?? []) as Order[];
  const itemsRes = orders.length
    ? await supabase.from("order_items").select("*").in("order_id", orders.map((o) => o.id))
    : { data: [], error: null };
  if (itemsRes.error) return null;
  return {
    orders,
    items: (itemsRes.data ?? []) as OrderItem[],
    subscriptions: (subsRes.data ?? []) as Subscription[],
    payments: (paymentsRes.data ?? []) as Payment[],
    requests: (requestsRes.data ?? []) as Request[],
  };
}
