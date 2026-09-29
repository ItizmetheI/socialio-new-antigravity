import { describe, expect, test } from "vitest";
import { buildTimeline, mrrCents, summarizeClients, type EverythingData } from "./loadEverything";
import type { Order, OrderItem, Request, Subscription } from "../../../lib/database.types";

const ORG = "org-1";
const order = (id: string, status: Order["status"], sub: string | null, at: string): Order =>
  ({ id, org_id: ORG, status, currency: "usd", amount_total: 29900, stripe_subscription_id: sub, created_at: at, paid_at: status === "paid" ? at : null }) as Order;
const item = (id: string, orderId: string): OrderItem =>
  ({ id, order_id: orderId, service_id: "social-media-posts", tier_label: "10 Posts", item_type: "service", billing_interval: "month", unit_amount: 29900, quantity: 1, units: 10 });
const request = (id: string, stage: Request["stage"], at: string): Request =>
  ({ id, org_id: ORG, stage, order_item_id: "item-paid", units: 1, created_at: at, title: id }) as Request;

function data(): EverythingData {
  return {
    orgs: [{ id: ORG, name: "Northwind", status: "active", stripe_customer_id: null, created_at: "2026-09-01T00:00:00Z" }],
    requests: [request("r1", "delivered", "2026-09-10T00:00:00Z"), request("r2", "delivered", "2026-09-11T00:00:00Z"), request("r3", "review", "2026-09-12T00:00:00Z")],
    plans: [],
    orders: [order("o-paid", "paid", "sub_1", "2026-09-05T00:00:00Z"), order("o-pending", "pending", null, "2026-09-20T00:00:00Z")],
    orderItems: [item("item-paid", "o-paid"), item("item-pending", "o-pending")],
    subscriptions: [{ id: "s1", org_id: ORG, order_id: "o-paid", stripe_subscription_id: "sub_1", status: "active", current_period_end: "2026-10-05T00:00:00Z", cancel_at_period_end: false, created_at: "", updated_at: "" }],
    payments: [
      { id: "p1", org_id: ORG, order_id: "o-paid", subscription_id: null, stripe_payment_intent_id: null, stripe_invoice_id: null, status: "succeeded", amount: 29900, currency: "usd", created_at: "2026-09-05T00:00:00Z" },
      { id: "p2", org_id: ORG, order_id: null, subscription_id: null, stripe_payment_intent_id: null, stripe_invoice_id: null, status: "failed", amount: 29900, currency: "usd", created_at: "2026-09-06T00:00:00Z" },
    ],
    activity: [],
    onboardings: [],
    brandKitOrgIds: new Set(),
    deliverables: [],
    leads: [],
    newsletterCount: 0,
    users: [
      { id: "u1", email: "sam@x.com", full_name: "Sam", role: "client", org_id: ORG, is_active: true, created_at: "2026-09-01T00:00:00Z", email_confirmed_at: null, last_sign_in_at: "2026-09-25T00:00:00Z", providers: ["google"] },
    ],
  };
}

describe("admin everything page data", () => {
  test("summarizes what a client paid, bought, got and has left", () => {
    const d = data();
    const [c] = summarizeClients(d, buildTimeline(d, (cents) => `$${cents / 100}`), new Date("2026-09-28T00:00:00Z"));
    expect(c.paidCents).toBe(29900); // failed payment not counted
    expect(c.pendingCheckouts).toBe(1);
    expect(c.unitsBought).toBe(10); // unpaid order's line not counted
    expect(c.unitsDelivered).toBe(2);
    expect(c.unitsRemaining).toBe(7); // 2 delivered + 1 in review drawn from 10
    expect(c.inReview).toBe(1);
    expect(c.lastSignIn).toBe("2026-09-25T00:00:00Z");
  });

  test("MRR counts only paid orders on a live subscription", () => {
    const d = data();
    expect(mrrCents(d.orders, d.orderItems, d.subscriptions)).toBe(29900);
    const canceled: Subscription[] = d.subscriptions.map((s) => ({ ...s, status: "canceled" }));
    expect(mrrCents(d.orders, d.orderItems, canceled)).toBe(0);
  });

  test("timeline merges sign-ups and checkouts newest first", () => {
    const entries = buildTimeline(data(), (cents) => `$${cents / 100}`);
    expect(entries.map((e) => e.type)).toEqual(["checkout", "checkout", "account"]);
    expect(entries[0].text).toBe("Opened a $299 checkout and hasn't paid");
    expect(entries[2].text).toBe("Sam created an account with Google (client)");
  });
});
