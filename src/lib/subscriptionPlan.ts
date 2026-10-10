import { servicesData, addOnsData } from "../data/services";
import type { ActivityEvent, Order, OrderItem, Subscription } from "./database.types";

const titleFor = (id: string) =>
  servicesData.find((s) => s.id === id)?.title ?? addOnsData.find((a) => a.id === id)?.title ?? id;

// What a subscription is for: the monthly lines of the order that started it
// (linked by Stripe's subscription id, which checkout stores on the order).
export function planForSubscription(sub: Subscription, orders: Order[], items: OrderItem[]) {
  const order = orders.find((o) => o.stripe_subscription_id === sub.stripe_subscription_id) ?? orders.find((o) => o.id === sub.order_id);
  const lines = order ? items.filter((i) => i.order_id === order.id && i.billing_interval === "month") : [];
  return {
    label: lines.length ? lines.map((i) => `${titleFor(i.service_id)} · ${i.tier_label}`).join(", ") : "Monthly plan",
    monthlyCents: lines.reduce((sum, i) => sum + i.unit_amount * i.quantity, 0),
    currency: order?.currency ?? "usd",
  };
}

// ---- Admin notices for new / cancelled subscriptions --------------------------

export const SUBSCRIPTION_KINDS = [
  "subscription_started",
  "subscription_canceling",
  "subscription_resumed",
  "subscription_ended",
] as const;

export type NoticeTone = "good" | "bad" | "neutral";

const NOTICE: Record<(typeof SUBSCRIPTION_KINDS)[number], { label: string; tone: NoticeTone }> = {
  subscription_started: { label: "New subscription", tone: "good" },
  subscription_canceling: { label: "Cancelled", tone: "bad" },
  subscription_resumed: { label: "Cancellation undone", tone: "good" },
  subscription_ended: { label: "Subscription ended", tone: "neutral" },
};

export const NOTICE_WINDOW_DAYS = 14;

// Subscription events the admin hasn't dismissed yet, newest first; nothing
// older than two weeks, so a long holiday doesn't bury the dashboard.
export function pendingNotices(events: ActivityEvent[], seenAt: string | null, now: Date = new Date()) {
  const windowStart = now.getTime() - NOTICE_WINDOW_DAYS * 86400000;
  const after = Math.max(windowStart, seenAt ? new Date(seenAt).getTime() : 0);
  return events
    .filter((e) => (SUBSCRIPTION_KINDS as readonly string[]).includes(e.kind) && new Date(e.created_at).getTime() > after)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function noticeView(event: ActivityEvent) {
  const meta = NOTICE[event.kind as (typeof SUBSCRIPTION_KINDS)[number]] ?? { label: "Subscription", tone: "neutral" as const };
  // The summary repeats the label before the colon ("Cancelled: …"); the pill already says it.
  return { ...meta, detail: event.summary.replace(/^[^:]+:\s*/, "") };
}
