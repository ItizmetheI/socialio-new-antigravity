import { describe, expect, it } from "vitest";
import type { Order, OrderItem, Request, Subscription } from "../../lib/database.types";
import { addMonths, computeLedger, unitsOf } from "./LedgerData";

const order: Order = {
  id: "o1",
  org_id: "org",
  created_by: "u",
  status: "paid",
  currency: "usd",
  amount_subtotal: 17800,
  amount_total: 17800,
  stripe_checkout_session_id: null,
  stripe_customer_id: null,
  stripe_subscription_id: "sub_1",
  created_at: "2026-08-31T12:00:00Z",
  paid_at: "2026-08-31T12:00:00Z",
};

const item = (overrides: Partial<OrderItem>): OrderItem => ({
  id: "posts",
  order_id: "o1",
  service_id: "social-media-posts",
  tier_label: "10 Posts",
  item_type: "service",
  billing_interval: "month",
  unit_amount: 7900,
  quantity: 1,
  units: 10,
  ...overrides,
});

const req = (overrides: Partial<Request>): Request => ({
  id: "r",
  org_id: "org",
  proposal_item_id: null,
  plan_item_id: null,
  title: "t",
  description: null,
  service_type: null,
  stage: "requested",
  assigned_to: null,
  created_by: "u",
  due_date: null,
  format: null,
  platforms: [],
  publish_at: null,
  order_item_id: "posts",
  units: 1,
  created_at: "2026-09-10T00:00:00Z",
  updated_at: "2026-09-10T00:00:00Z",
  ...overrides,
});

const sub: Subscription = {
  id: "s",
  org_id: "org",
  order_id: null,
  stripe_subscription_id: "sub_1",
  status: "active",
  current_period_end: "2026-09-30T12:00:00Z",
  cancel_at_period_end: false,
  created_at: "2026-08-31T12:00:00Z",
  updated_at: "2026-08-31T12:00:00Z",
};

describe("order ledger", () => {
  it("falls back to the tier label's number when units is unset", () => {
    expect(unitsOf(item({ units: null, tier_label: "20 Posts" }))).toBe(20);
    expect(unitsOf(item({ units: null, tier_label: "One-time" }))).toBe(1);
    expect(unitsOf(item({ units: 10, quantity: 2 }))).toBe(20);
  });

  it("clamps month steps to the month's last day", () => {
    expect(addMonths(new Date("2026-03-31T00:00:00Z"), -1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("counts only this period's requests on a monthly line and prices what's left", () => {
    const [line] = computeLedger({
      orders: [order],
      items: [item({})],
      subscriptions: [sub],
      payments: [],
      requests: [
        req({ id: "old", stage: "delivered", units: 5, created_at: "2026-08-25T00:00:00Z" }), // last period
        req({ id: "d", stage: "delivered", units: 4 }),
        req({ id: "p", stage: "review", units: 2 }),
        req({ id: "q", stage: "requested", units: 3 }),
        req({ id: "x", order_item_id: null, units: 9 }), // not linked
      ],
    });
    expect([line.delivered, line.inProgress, line.requested, line.remaining, line.over]).toEqual([4, 2, 3, 1, 0]);
    expect(line.valueRemainingCents).toBe(790);
  });

  it("rolls the purchase date forward when no subscription row exists, and flags overuse", () => {
    const [line] = computeLedger(
      {
        orders: [{ ...order, stripe_subscription_id: null }],
        items: [item({ units: 2 })],
        subscriptions: [],
        payments: [],
        requests: [req({ units: 3, created_at: "2026-10-05T00:00:00Z" })],
      },
      new Date("2026-10-10T00:00:00Z"),
    );
    expect(line.periodStart.toISOString()).toBe("2026-09-30T12:00:00.000Z");
    expect([line.remaining, line.over, line.valueRemainingCents]).toEqual([0, 1, 0]);
  });

  it("ignores unpaid orders", () => {
    expect(computeLedger({ orders: [{ ...order, status: "pending" }], items: [item({})], subscriptions: [], payments: [], requests: [] })).toEqual([]);
  });
});
