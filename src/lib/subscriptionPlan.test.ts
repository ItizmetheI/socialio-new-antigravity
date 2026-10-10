import { describe, expect, it } from "vitest";
import { noticeView, pendingNotices, planForSubscription } from "./subscriptionPlan";
import type { ActivityEvent, Order, OrderItem, Subscription } from "./database.types";

const sub = { id: "s1", org_id: "o1", order_id: null, stripe_subscription_id: "sub_1", status: "active", current_period_end: null, cancel_at_period_end: false, created_at: "", updated_at: "" } as Subscription;
const order = { id: "ord1", org_id: "o1", stripe_subscription_id: "sub_1", currency: "usd" } as Order;
const items = [
  { id: "i1", order_id: "ord1", service_id: "social-media-posts", tier_label: "10 Posts", unit_amount: 7900, quantity: 1, billing_interval: "month" },
  { id: "i2", order_id: "ord1", service_id: "rush-delivery", tier_label: "One-time", unit_amount: 4900, quantity: 1, billing_interval: "one_time" },
] as OrderItem[];

const ev = (id: number, kind: ActivityEvent["kind"], hoursAgo: number, summary = "x: y"): ActivityEvent => ({
  id, org_id: "o1", actor_id: null, kind, request_id: null, summary, is_internal: false,
  created_at: new Date(Date.parse("2026-10-09T12:00:00Z") - hoursAgo * 3600000).toISOString(),
});
const now = new Date("2026-10-09T12:00:00Z");

describe("planForSubscription", () => {
  it("names the plan from the order's monthly lines only", () => {
    expect(planForSubscription(sub, [order], items)).toEqual({ label: "Social Media Posts · 10 Posts", monthlyCents: 7900, currency: "usd" });
  });
  it("falls back when the order isn't known", () => {
    expect(planForSubscription(sub, [], []).label).toBe("Monthly plan");
  });
});

describe("pendingNotices", () => {
  const events = [
    ev(1, "subscription_started", 2),
    ev(2, "payment_received", 1),
    ev(3, "subscription_canceling", 30),
    ev(4, "subscription_ended", 24 * 20),
  ];
  it("keeps only subscription events from the last two weeks, newest first", () => {
    expect(pendingNotices(events, null, now).map((e) => e.id)).toEqual([1, 3]);
  });
  it("hides what the admin already dismissed", () => {
    expect(pendingNotices(events, ev(0, "subscription_started", 10).created_at, now).map((e) => e.id)).toEqual([1]);
  });
});

describe("noticeView", () => {
  it("drops the repeated label from the summary and picks a tone", () => {
    expect(noticeView(ev(1, "subscription_canceling", 1, "Cancelled: Social Media Posts · 10 Posts ($1.00/month). Stays active until Nov 8, 2026, no further charges")))
      .toEqual({ label: "Cancelled", tone: "bad", detail: "Social Media Posts · 10 Posts ($1.00/month). Stays active until Nov 8, 2026, no further charges" });
  });
});
