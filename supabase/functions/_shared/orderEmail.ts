// "Your order is confirmed" email, sent once per paid order by stripe-webhook.
// Pure builder (no I/O) so the wording and escaping are unit-tested
// (src/lib/orderEmail.test.ts).
import { button, details, escapeHtml, layout, p, small } from "./emailLayout.js";

export interface OrderEmailLine {
  title: string;
  tier: string;
  cents: number;
  monthly: boolean;
}

export interface OrderEmailInput {
  siteUrl: string;
  name: string | null;
  lines: OrderEmailLine[];
  paidCents: number;
  currency: string;
  nextChargeAt: Date | null; // null for a one-time order
  orderRef: string;
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// The same three steps the client's dashboard shows before work exists.
const NEXT_STEPS = [
  ["Tell us about your business", "A short brand questionnaire in your dashboard: tone, colours, audience. About 5 minutes."],
  ["Approve your plan", "We plan the month's content and send it to you. Approve it or ask for changes."],
  ["We start making content", "Finished work lands in your dashboard for review before anything goes out."],
];

export function orderConfirmationEmail(o: OrderEmailInput): { subject: string; html: string; text: string } {
  const monthlyCents = o.lines.filter((l) => l.monthly).reduce((s, l) => s + l.cents, 0);
  const isSubscription = monthlyCents > 0;
  const firstTitle = o.lines[0]?.title ?? "Your order";
  const subject = `You're in: ${firstTitle}${o.lines.length > 1 ? ` + ${o.lines.length - 1} more` : ""} is confirmed`;
  const firstName = o.name?.trim().split(/\s+/)[0];
  const hiText = firstName ? `Hi ${firstName},` : "Hi there,";
  const hi = escapeHtml(hiText);
  const dashboard = `${o.siteUrl}/app`;

  const rows: [string, string][] = o.lines.map((l) => [
    escapeHtml(l.title),
    `${escapeHtml(l.tier)} · ${money(l.cents, o.currency)}${l.monthly ? " / month" : " one-time"}`,
  ]);
  rows.push(["Paid today", money(o.paidCents, o.currency)]);
  if (isSubscription) {
    rows.push(["Billing", `Monthly, ${money(monthlyCents, o.currency)}${o.nextChargeAt ? `. Next charge ${day(o.nextChargeAt)}` : ""}`]);
  }
  rows.push(["Order", escapeHtml(o.orderRef)]);

  const steps = NEXT_STEPS.map(
    ([title, body], i) =>
      `<p style="margin:0 0 12px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:14px;line-height:1.6;color:#4a4a52;"><strong style="color:#0b0b0d;">${i + 1}. ${title}</strong><br>${body}</p>`,
  ).join("");

  const cancelNote = isSubscription
    ? small(
        "Your plan renews monthly. You can cancel any time from Account → Billing in your dashboard. Cancelling stops the next charge; the month you've paid for still runs to the end.",
      )
    : "";

  const html = layout({
    siteUrl: o.siteUrl,
    preheader: `Payment received. Here's what you bought and what happens next.`,
    heading: "Your order is confirmed",
    content:
      p(hi) +
      p("Thanks for choosing Socialio. Your payment went through and your order is active. Here's what you bought:") +
      details(rows) +
      p(`<strong style="color:#0b0b0d;">What happens next</strong>`) +
      steps +
      button(dashboard, "Open your dashboard") +
      cancelNote,
  });

  const text = [
    hiText,
    "",
    "Thanks for choosing Socialio. Your payment went through and your order is active.",
    "",
    ...o.lines.map((l) => `- ${l.title} (${l.tier}): ${money(l.cents, o.currency)}${l.monthly ? " / month" : " one-time"}`),
    `Paid today: ${money(o.paidCents, o.currency)}`,
    ...(isSubscription ? [`Billing: monthly${o.nextChargeAt ? `, next charge ${day(o.nextChargeAt)}` : ""}`] : []),
    `Order: ${o.orderRef}`,
    "",
    "What happens next:",
    ...NEXT_STEPS.map(([t, b], i) => `${i + 1}. ${t}: ${b}`),
    "",
    `Open your dashboard: ${dashboard}`,
    ...(isSubscription ? ["", "Cancel any time from Account > Billing. Cancelling stops the next charge; the month you've paid for still runs to the end."] : []),
    "",
    "Questions? support@socialio.io",
  ].join("\n");

  return { subject, html, text };
}
