import { describe, expect, it } from "vitest";
import { orderConfirmationEmail } from "../../supabase/functions/_shared/orderEmail.ts";

const base = {
  siteUrl: "https://socialio.io",
  name: "Sam Rivera",
  lines: [{ title: "Social Media Posts", tier: "10 Posts", cents: 7900, monthly: true }],
  paidCents: 7900,
  currency: "usd",
  nextChargeAt: new Date("2026-11-08T02:58:30Z"),
  orderRef: "F65E43D0",
};

describe("orderConfirmationEmail", () => {
  it("states what was bought, monthly price, next charge and how cancelling works", () => {
    const { subject, html, text } = orderConfirmationEmail(base);
    expect(subject).toBe("You're in: Social Media Posts is confirmed");
    expect(html).toContain("Hi Sam,");
    expect(html).toContain("10 Posts · $79.00 / month");
    expect(html).toContain("Next charge Nov 8, 2026");
    expect(html).toContain("Approve your plan");
    expect(html).toContain('href="https://socialio.io/app"');
    expect(text).toContain("Cancel any time from Account > Billing");
  });

  it("escapes a customer-supplied name so it can't inject HTML", () => {
    const { html } = orderConfirmationEmail({ ...base, name: "<img src=x onerror=alert(1)>" });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("has no renewal or cancel wording for a one-time order", () => {
    const { html, text } = orderConfirmationEmail({
      ...base,
      lines: [{ title: "Rush Delivery", tier: "One-time", cents: 4900, monthly: false }],
      paidCents: 4900,
      nextChargeAt: null,
    });
    expect(html).toContain("$49.00 one-time");
    expect(html).not.toContain("Next charge");
    expect(text).not.toContain("Cancel any time");
  });
});
