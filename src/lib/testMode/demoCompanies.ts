// A whole running agency for the demo: six more client companies on top of
// Aurora (new) and Northwind (active) in fixtures.ts. Every date is relative
// to today, so the demo never looks stale: renewals are always ahead, the
// new subscription is from this morning, the cancellation from yesterday.
// Each company is one spec below; build() turns it into the same rows the
// real database would hold (org, client login, onboarding, plan, order,
// subscription, payments, requests, files, comments, results, activity).
import type {
  ActivityEvent,
  ClientOnboarding,
  Comment,
  ContactSubmission,
  ContentFormat,
  Deliverable,
  NewsletterSignup,
  Order,
  OrderItem,
  Organization,
  PerformanceReport,
  Plan,
  PlanItem,
  Platform,
  Profile,
  Request,
  RequestStage,
  Subscription,
  SubscriptionStatus,
  Payment,
  OrganizationStatus,
  SocialLogin,
  SocialLoginEvent,
} from "../database.types";

const DAY = 86400000;
const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (d: number) => iso(NOW - d * DAY);
const daysAhead = (d: number) => iso(NOW + d * DAY);
const dateOnly = (d: number) => iso(NOW + d * DAY).slice(0, 10);
const monthStart = (monthsBack: number) => {
  const d = new Date(NOW);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1)).toISOString().slice(0, 10);
};
const money = (cents: number) => `${(cents / 100).toFixed(2)} USD`;

export const DEMO_STAFF: Profile[] = [
  { id: "staff-jordan", org_id: null, role: "internal", full_name: "Jordan Reyes", is_active: true, created_at: daysAgo(240) },
  { id: "staff-aisha", org_id: null, role: "internal", full_name: "Aisha Bello", is_active: true, created_at: daysAgo(190) },
];
const STAFF = ["staff-morgan", "staff-jordan", "staff-aisha", "staff-priya"];

type Line = { service: string; title: string; tier: string; cents: number; units: number };
type Job = { title: string; stage: RequestStage; format: ContentFormat; platforms: Platform[]; due: number; units?: number; line?: number; note?: string };
type Spec = {
  key: string;
  name: string;
  contact: { name: string; email: string };
  sinceDays: number;
  orgStatus: OrganizationStatus;
  lines: Line[];
  sub: { status: SubscriptionStatus; cancelAtPeriodEnd?: boolean; renewsInDays: number; endedDaysAgo?: number };
  onboarding: "reviewed" | "submitted";
  planStatus: "approved" | "sent";
  answers: ClientOnboarding["answers"];
  jobs: Job[];
  results?: { platform: Platform; followers: number; growth: number; reach: number; er: number }[];
  extraEvents?: { kind: ActivityEvent["kind"]; hoursAgo: number; summary: string; internal?: boolean }[];
};

const SPECS: Spec[] = [
  {
    key: "lumen",
    name: "Lumen Fitness Studio",
    contact: { name: "Maya Chen", email: "maya@lumenfitness.example" },
    sinceDays: 152,
    orgStatus: "active",
    lines: [
      { service: "social-media-posts", title: "Social Media Posts", tier: "30 Posts", cents: 27900, units: 30 },
      { service: "short-form-videos", title: "Short-Form Videos", tier: "10 Videos", cents: 25900, units: 10 },
    ],
    sub: { status: "active", renewsInDays: 12 },
    onboarding: "reviewed",
    planStatus: "approved",
    answers: { business_name: "Lumen Fitness Studio", business_description: "Boutique strength and pilates studio, two locations in Austin.", target_audience: "Women 25-45 who want strength training without the gym-bro vibe", brand_voice: "Encouraging, energetic, zero shame", platforms: ["instagram", "tiktok"], existing_handles: "@lumenfitnessatx", goals: "Fill the 6am classes and grow the new Riverside location", content_guidelines: "Real members only (with consent), no before/after body shots" },
    jobs: [
      { title: "October class schedule carousels", stage: "delivered", format: "carousel", platforms: ["instagram"], due: -9, units: 4, line: 0 },
      { title: "Coach spotlight: Dani", stage: "delivered", format: "reel", platforms: ["instagram", "tiktok"], due: -6, line: 1 },
      { title: "Member transformation stories (no before/after)", stage: "delivered", format: "graphic", platforms: ["instagram"], due: -4, units: 3, line: 0 },
      { title: "Riverside location opening countdown", stage: "review", format: "reel", platforms: ["instagram", "tiktok"], due: 1, line: 1, note: "Cut 1 is up. Is the opening date on screen long enough?" },
      { title: "6am class hype reels", stage: "in_progress", format: "reel", platforms: ["tiktok"], due: 4, units: 2, line: 1 },
      { title: "Halloween workout challenge posts", stage: "in_progress", format: "graphic", platforms: ["instagram"], due: 8, units: 5, line: 0 },
      { title: "November promo: bring a friend week", stage: "requested", format: "carousel", platforms: ["instagram"], due: 15, units: 3, line: 0 },
    ],
    results: [
      { platform: "instagram", followers: 4200, growth: 380, reach: 18000, er: 4.1 },
      { platform: "tiktok", followers: 1300, growth: 520, reach: 26000, er: 6.4 },
    ],
  },
  {
    key: "vela",
    name: "Vela Fine Jewelry",
    contact: { name: "Isabella Moreau", email: "isabella@velajewelry.example" },
    sinceDays: 96,
    orgStatus: "active",
    lines: [
      { service: "ugc-content", title: "UGC Videos", tier: "6 Videos", cents: 109900, units: 6 },
      { service: "short-form-videos", title: "Short-Form Videos", tier: "25 Videos", cents: 52900, units: 25 },
    ],
    sub: { status: "active", renewsInDays: 19 },
    onboarding: "reviewed",
    planStatus: "approved",
    answers: { business_name: "Vela Fine Jewelry", business_description: "Handmade recycled-gold jewelry, sold online and in two boutiques.", target_audience: "Women 28-50 buying meaningful pieces and gifts", brand_voice: "Quiet luxury, warm, never salesy", platforms: ["instagram", "tiktok", "facebook"], existing_handles: "@velafinejewelry", goals: "Holiday season sales and engagement-ring leads", inspiration: "Mejuri, Catbird" },
    jobs: [
      { title: "Engagement ring unboxing UGC", stage: "review", format: "ugc_video", platforms: ["tiktok", "instagram"], due: -1, line: 0, note: "Two creator takes uploaded. Pick your favourite and we'll finish it." },
      { title: "Holiday gift guide reels", stage: "in_progress", format: "reel", platforms: ["instagram", "tiktok"], due: -3, units: 4, line: 1 },
      { title: "Behind the bench: how a ring is made", stage: "in_progress", format: "reel", platforms: ["instagram", "youtube"], due: 5, units: 2, line: 1 },
      { title: "Stacking rings try-on UGC", stage: "delivered", format: "ugc_video", platforms: ["tiktok"], due: -10, line: 0 },
      { title: "Recycled gold story series", stage: "delivered", format: "reel", platforms: ["instagram", "facebook"], due: -14, units: 3, line: 1 },
      { title: "Black Friday teaser set", stage: "requested", format: "reel", platforms: ["instagram", "tiktok", "facebook"], due: 21, units: 5, line: 1 },
    ],
    results: [
      { platform: "instagram", followers: 11800, growth: 900, reach: 52000, er: 3.6 },
      { platform: "tiktok", followers: 3100, growth: 1400, reach: 88000, er: 7.9 },
    ],
  },
  {
    key: "harbor",
    name: "Harbor & Pine Realty",
    contact: { name: "Daniel Brooks", email: "daniel@harborpine.example" },
    sinceDays: 0.15,
    orgStatus: "active",
    lines: [
      { service: "social-media-posts", title: "Social Media Posts", tier: "20 Posts", cents: 17900, units: 20 },
      { service: "instagram-growth", title: "Instagram Growth", tier: "Monthly", cents: 12900, units: 1 },
    ],
    sub: { status: "active", renewsInDays: 30 },
    onboarding: "submitted",
    planStatus: "sent",
    answers: { business_name: "Harbor & Pine Realty", business_description: "Independent real-estate team on the Maine coast: homes, cottages, waterfront.", target_audience: "Buyers relocating from Boston and NYC, local sellers", brand_voice: "Trustworthy, local, a little salty", platforms: ["instagram", "facebook"], existing_handles: "@harborandpine", goals: "More listing leads and a recognisable local brand" },
    jobs: [],
    extraEvents: [{ kind: "plan_sent", hoursAgo: 1, summary: "Plan v1 sent for approval" }],
  },
  {
    key: "saffron",
    name: "Saffron Table",
    contact: { name: "Arjun Mehta", email: "arjun@saffrontable.example" },
    sinceDays: 64,
    orgStatus: "active",
    lines: [
      { service: "social-media-posts", title: "Social Media Posts", tier: "20 Posts", cents: 17900, units: 20 },
      { service: "short-form-videos", title: "Short-Form Videos", tier: "5 Videos", cents: 12900, units: 5 },
    ],
    sub: { status: "active", cancelAtPeriodEnd: true, renewsInDays: 22 },
    onboarding: "reviewed",
    planStatus: "approved",
    answers: { business_name: "Saffron Table", business_description: "Modern Indian restaurant and catering in Philadelphia.", target_audience: "Local diners 25-55, office catering managers", brand_voice: "Warm, generous, proud of the food", platforms: ["instagram", "tiktok"], existing_handles: "@saffrontablephl" },
    jobs: [
      { title: "Diwali tasting menu posts", stage: "in_progress", format: "carousel", platforms: ["instagram"], due: 6, units: 4, line: 0 },
      { title: "Tandoor in action reel", stage: "delivered", format: "reel", platforms: ["instagram", "tiktok"], due: -12, line: 1 },
      { title: "Lunch catering promo graphics", stage: "delivered", format: "graphic", platforms: ["instagram"], due: -18, units: 3, line: 0 },
    ],
    results: [{ platform: "instagram", followers: 2600, growth: 140, reach: 9000, er: 3.2 }],
    extraEvents: [{ kind: "subscription_canceling", hoursAgo: 20, summary: "" }],
  },
  {
    key: "kinfolk",
    name: "Kinfolk Pet Supply",
    contact: { name: "Hannah Price", email: "hannah@kinfolkpets.example" },
    sinceDays: 121,
    orgStatus: "active",
    lines: [
      { service: "seo-blog-posts", title: "Blog Post", tier: "4 Posts", cents: 17900, units: 4 },
      { service: "seo-backlinks", title: "SEO Backlinks", tier: "6 Backlinks", cents: 47900, units: 6 },
    ],
    sub: { status: "past_due", renewsInDays: -2 },
    onboarding: "reviewed",
    planStatus: "approved",
    answers: { business_name: "Kinfolk Pet Supply", business_description: "Online store for sustainable dog and cat gear.", target_audience: "Millennial pet parents who read labels", brand_voice: "Friendly expert, never preachy", platforms: ["blog"], goals: "Rank for 'eco dog toys' and grow organic sales" },
    jobs: [
      { title: "Blog: best eco-friendly dog toys 2026", stage: "delivered", format: "seo_article", platforms: ["blog"], due: -8, line: 0 },
      { title: "Blog: how to choose a sustainable cat litter", stage: "review", format: "seo_article", platforms: ["blog"], due: 2, line: 0, note: "Draft ready. We added a comparison table, OK to keep?" },
      { title: "Backlinks: pet lifestyle publications", stage: "in_progress", format: "other", platforms: ["blog"], due: 10, units: 6, line: 1 },
    ],
    extraEvents: [{ kind: "payment_received", hoursAgo: 50, summary: "Payment failed: 658.00 USD (card declined, Stripe retrying)", internal: true }],
  },
  {
    key: "brightside",
    name: "Brightside Dental",
    contact: { name: "Dr. Kevin Walsh", email: "kevin@brightsidedental.example" },
    sinceDays: 110,
    orgStatus: "canceled",
    lines: [{ service: "social-media-posts", title: "Social Media Posts", tier: "10 Posts", cents: 7900, units: 10 }],
    sub: { status: "canceled", renewsInDays: -21, endedDaysAgo: 21 },
    onboarding: "reviewed",
    planStatus: "approved",
    answers: { business_name: "Brightside Dental", business_description: "Family dental practice in Cherry Hill, NJ.", target_audience: "Local families", brand_voice: "Calm, friendly, reassuring", platforms: ["facebook", "instagram"] },
    jobs: [
      { title: "Back-to-school checkup reminders", stage: "delivered", format: "graphic", platforms: ["facebook", "instagram"], due: -40, units: 4, line: 0 },
      { title: "Meet the hygienists carousel", stage: "delivered", format: "carousel", platforms: ["facebook"], due: -55, units: 2, line: 0 },
    ],
  },
];

// ---- Build rows ----------------------------------------------------------------

export const demo = {
  organizations: [] as Organization[],
  profiles: [...DEMO_STAFF] as Profile[],
  onboarding: [] as ClientOnboarding[],
  plans: [] as Plan[],
  planItems: [] as PlanItem[],
  orders: [] as Order[],
  orderItems: [] as OrderItem[],
  subscriptions: [] as Subscription[],
  payments: [] as Payment[],
  requests: [] as Request[],
  deliverables: [] as Deliverable[],
  comments: [] as Comment[],
  reports: [] as PerformanceReport[],
  activity: [] as ActivityEvent[],
  accounts: [] as { id: string; email: string; full_name: string; role: Profile["role"]; org_id: string | null; created_at: string; last_sign_in_at: string }[],
};

let eventId = 1000;
const log = (org: string, kind: ActivityEvent["kind"], at: string, summary: string, requestId: string | null = null, internal = false) =>
  demo.activity.push({ id: eventId++, org_id: org, actor_id: null, kind, request_id: requestId, summary, is_internal: internal, created_at: at });

SPECS.forEach((s, n) => {
  const org = `org-${s.key}`;
  const client = `client-${s.key}`;
  const since = daysAgo(s.sinceDays);
  const monthly = s.lines.reduce((sum, l) => sum + l.cents, 0);
  const planLabel = `${s.lines.map((l) => `${l.title} · ${l.tier}`).join(", ")} ($${(monthly / 100).toFixed(2)}/month)`;

  demo.organizations.push({ id: org, name: s.name, stripe_customer_id: `cus_demo_${s.key}`, status: s.orgStatus, created_at: since });
  demo.profiles.push({ id: client, org_id: org, role: "client", full_name: s.contact.name, is_active: true, created_at: since });
  demo.accounts.push({ id: client, email: s.contact.email, full_name: s.contact.name, role: "client", org_id: org, created_at: since, last_sign_in_at: daysAgo(Math.min(s.sinceDays, 1 + n * 2)) });

  demo.onboarding.push({
    id: `onboarding-${s.key}`, org_id: org, status: s.onboarding, answers: s.answers,
    submitted_at: daysAgo(Math.max(s.sinceDays - 1, 0.1)),
    reviewed_at: s.onboarding === "reviewed" ? daysAgo(Math.max(s.sinceDays - 2, 0)) : null,
    reviewed_by: s.onboarding === "reviewed" ? STAFF[n % 3] : null,
    created_at: since,
  });

  const planId = `plan-${s.key}-1`;
  demo.plans.push({
    id: planId, org_id: org, created_by: "staff-priya", status: s.planStatus, version: 1, supersedes_plan_id: null,
    total_price: monthly / 100, sent_at: daysAgo(Math.max(s.sinceDays - 3, 0.05)), viewed_at: s.planStatus === "approved" ? daysAgo(Math.max(s.sinceDays - 3, 0)) : null,
    responded_at: s.planStatus === "approved" ? daysAgo(Math.max(s.sinceDays - 4, 0)) : null, created_at: daysAgo(Math.max(s.sinceDays - 2, 0.1)),
  });
  s.lines.forEach((l, i) =>
    demo.planItems.push({ id: `${planId}-item-${i}`, plan_id: planId, service_id: l.service, deliverable_label: `${l.tier} each month`, quantity: l.units, frequency: "monthly", platform: s.answers.platforms?.[0] ?? null, price: l.cents / 100, notes: null }),
  );

  const orderId = `order-${s.key}-1`;
  const subId = `sub_demo_${s.key}`;
  demo.orders.push({
    id: orderId, org_id: org, created_by: client, status: "paid", currency: "usd", amount_subtotal: monthly, amount_total: monthly,
    stripe_checkout_session_id: `cs_demo_${s.key}`, stripe_customer_id: `cus_demo_${s.key}`, stripe_subscription_id: subId, created_at: since, paid_at: since, confirmation_email_sent_at: since,
  });
  s.lines.forEach((l, i) =>
    demo.orderItems.push({ id: `oi-${s.key}-${i}`, order_id: orderId, service_id: l.service, tier_label: l.tier, item_type: "service", billing_interval: "month", unit_amount: l.cents, quantity: 1, units: l.units }),
  );

  const subscription: Subscription = {
    id: `subscription-${s.key}`, org_id: org, order_id: orderId, stripe_subscription_id: subId, status: s.sub.status,
    current_period_end: daysAhead(s.sub.renewsInDays), cancel_at_period_end: s.sub.cancelAtPeriodEnd ?? false, created_at: since, updated_at: daysAgo(1),
  };
  demo.subscriptions.push(subscription);

  // First payment at checkout, then one renewal every 30 days while the plan ran.
  const paidUntil = s.sub.endedDaysAgo ?? (s.sub.status === "past_due" ? 2 : 0);
  log(org, "subscription_started", since, `New subscription: ${planLabel}`);
  for (let d = s.sinceDays, i = 0; d >= paidUntil; d -= 30, i++) {
    const at = daysAgo(d);
    demo.payments.push({ id: `pay-${s.key}-${i}`, org_id: org, order_id: i === 0 ? orderId : null, subscription_id: i === 0 ? null : subscription.id, stripe_payment_intent_id: null, stripe_invoice_id: i === 0 ? null : `in_demo_${s.key}_${i}`, status: "succeeded", amount: monthly, currency: "usd", created_at: at });
    log(org, "payment_received", at, `Payment received: ${money(monthly)}`);
  }
  if (s.sub.endedDaysAgo) {
    log(org, "subscription_canceling", daysAgo(s.sub.endedDaysAgo + 18), `Cancelled: ${planLabel}. Stays active until ${new Date(NOW - s.sub.endedDaysAgo * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, no further charges`);
    log(org, "subscription_ended", daysAgo(s.sub.endedDaysAgo), `Subscription ended: ${planLabel}`);
  }
  if (s.planStatus === "approved") log(org, "plan_approved", daysAgo(Math.max(s.sinceDays - 4, 0)), "Plan v1 approved");

  s.jobs.forEach((j, i) => {
    const id = `req-${s.key}-${i}`;
    const created = daysAgo(Math.max(14 - j.due, 2) + i);
    const assignee = j.stage === "requested" ? null : STAFF[(n + i) % 3];
    demo.requests.push({
      id, org_id: org, proposal_item_id: null, plan_item_id: `${planId}-item-${j.line ?? 0}`, title: j.title, description: null,
      service_type: s.lines[j.line ?? 0].service, stage: j.stage, assigned_to: assignee, created_by: i % 2 ? client : "staff-priya",
      due_date: dateOnly(j.due), format: j.format, platforms: j.platforms,
      publish_at: j.stage === "requested" ? null : iso(NOW + (j.due + 2) * DAY + 15 * 3600000), order_item_id: `oi-${s.key}-${j.line ?? 0}`,
      units: j.units ?? 1, created_at: created, updated_at: daysAgo(Math.max(-j.due, 0) + 0.5),
    });
    if (j.stage === "delivered" || j.stage === "review") {
      demo.deliverables.push({ id: `file-${s.key}-${i}`, request_id: id, file_path: `${org}/${id}/${j.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${j.format === "seo_article" ? "pdf" : "mp4"}`, uploaded_by: assignee ?? "staff-morgan", created_at: daysAgo(Math.max(-j.due, 0) + 1) });
    }
    if (j.note) {
      demo.comments.push({ id: `comment-${s.key}-${i}`, request_id: id, author_id: assignee ?? "staff-morgan", body: j.note, visibility: "client", created_at: daysAgo(0.3 + i * 0.1) });
    }
    const verb = j.stage === "delivered" ? "was approved and delivered" : j.stage === "review" ? "is ready for review" : j.stage === "in_progress" ? "is now in production" : null;
    log(org, verb ? "stage_changed" : "request_created", daysAgo(Math.max(-j.due, 0) + 0.2 + i * 0.05), verb ? `"${j.title}" ${verb}` : `New request: ${j.title}`, id);
  });

  const months = Math.min(Math.floor(s.sinceDays / 30), 5);
  (s.results ?? []).forEach((r) => {
    for (let m = months; m >= 1; m--) {
      const step = months - m;
      demo.reports.push({
        id: `report-${s.key}-${r.platform}-${m}`, org_id: org, period_month: monthStart(m), platform: r.platform,
        followers: r.followers + r.growth * step, reach: Math.round(r.reach * (1 + step * 0.18)), engagement_rate: Math.round((r.er + step * 0.3) * 10) / 10,
        posts_published: 10 + step * 2, notes: null, created_by: "staff-priya", created_at: monthStart(m - 1), updated_at: monthStart(m - 1),
      });
    }
  });

  (s.extraEvents ?? []).forEach((e) => {
    const summary =
      e.kind === "subscription_canceling"
        ? `Cancelled: ${planLabel}. Stays active until ${new Date(NOW + s.sub.renewsInDays * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, no further charges`
        : e.summary;
    log(org, e.kind, daysAgo(e.hoursAgo / 24), summary, null, e.internal ?? false);
  });
});

export const DEMO_STAFF_ACCOUNTS = [
  { id: "staff-jordan", email: "jordan@socialio.io", full_name: "Jordan Reyes", role: "internal" as const, org_id: null, created_at: daysAgo(240), last_sign_in_at: daysAgo(0.2) },
  { id: "staff-aisha", email: "aisha@socialio.io", full_name: "Aisha Bello", role: "internal" as const, org_id: null, created_at: daysAgo(190), last_sign_in_at: daysAgo(0.6) },
];

// Website leads the team is working through.
export const DEMO_LEADS: ContactSubmission[] = [
  { id: "lead-1", created_at: daysAgo(0.1), name: "Olivia Grant", email: "olivia@bloomandco.example", company: "Bloom & Co Florists", service: "Social Media Posts", budget: "$200-500/mo", message: "Two shops, we post maybe once a week. Want it to look consistent and actually bring people in for Valentine's.", status: "new" },
  { id: "lead-2", created_at: daysAgo(0.8), name: "Marcus Hill", email: "marcus@ironworksgym.example", company: "Ironworks Gym", service: "Short-Form Videos", budget: "$500-1,000/mo", message: "Saw what you did for a fitness studio. Can you do 15 reels a month with our coaches?", status: "new" },
  { id: "lead-3", created_at: daysAgo(2), name: "Sofia Alvarez", email: "sofia@terracottahome.example", company: "Terracotta Home", service: "UGC Videos", budget: "$1,000+/mo", message: "Launching a ceramics line in November and need creator videos fast.", status: "contacted" },
  { id: "lead-4", created_at: daysAgo(4), name: "Ben Carter", email: "ben@carterlaw.example", company: "Carter Law Group", service: "Blog Post", budget: "$100-200/mo", message: "Need 2 SEO articles a month about estate planning.", status: "contacted" },
  { id: "lead-5", created_at: daysAgo(9), name: "Grace Kim", email: "grace@noodlebar.example", company: "Han Noodle Bar", service: "Social Media Posts", budget: "Under $100/mo", message: "Just want to know pricing for a small restaurant.", status: "closed" },
];

export const DEMO_NEWSLETTER: NewsletterSignup[] = [
  "lena.fox", "tom.r", "hello@crumbbakery", "ana.p", "jay.music", "priya.k", "studio.north", "ellie.b",
].map((name, i) => ({ id: `nl-${i}`, email: name.includes("@") ? `${name}.example` : `${name}@mail.example`, created_at: daysAgo(i * 1.7 + 0.3) }));

// Social logins the clients have shared (demo passwords are obviously fake;
// in the real app they're encrypted and never sit in the browser).
type DemoLogin = { org: string; platform: SocialLogin["platform"]; label?: string; username: string; status: SocialLogin["status"]; note?: string; daysAgo: number; revealedBy?: string };
const DEMO_LOGIN_SPECS: DemoLogin[] = [
  { org: "org-northwind", platform: "instagram", username: "@northwindcoffee", status: "working", daysAgo: 40, revealedBy: "staff-morgan" },
  { org: "org-northwind", platform: "tiktok", username: "sam@northwind-coffee.example", status: "submitted", daysAgo: 1 },
  { org: "org-lumen", platform: "instagram", username: "@lumenfitnessatx", status: "working", daysAgo: 150, revealedBy: "staff-jordan" },
  { org: "org-lumen", platform: "tiktok", username: "@lumenfitnessatx", status: "working", daysAgo: 150, revealedBy: "staff-jordan" },
  { org: "org-vela", platform: "instagram", username: "@velafinejewelry", status: "working", daysAgo: 95, revealedBy: "staff-aisha" },
  { org: "org-vela", platform: "tiktok", username: "isabella@velajewelry.example", status: "not_working", note: "The login code went to Isabella's phone. Can you text it to us when we log in?", daysAgo: 3 },
  { org: "org-saffron", platform: "instagram", username: "@saffrontablephl", status: "working", daysAgo: 62 },
  { org: "org-kinfolk", platform: "other", label: "WordPress (blog)", username: "kinfolk-editor", status: "working", daysAgo: 118, revealedBy: "staff-morgan" },
];

export const DEMO_SOCIAL_LOGINS: SocialLogin[] = DEMO_LOGIN_SPECS.map((l, i) => ({
  id: `demo-login-${i}`,
  org_id: l.org,
  platform: l.platform,
  label: l.label ?? null,
  username: l.username,
  status: l.status,
  status_note: l.note ?? null,
  created_by: null,
  created_at: daysAgo(l.daysAgo),
  updated_at: daysAgo(l.daysAgo),
  last_revealed_at: l.revealedBy ? daysAgo(Math.min(l.daysAgo, 2 + i)) : null,
  last_revealed_by: l.revealedBy ?? null,
}));

export const DEMO_SOCIAL_SECRETS = new Map<string, { password: string; notes: string }>(
  DEMO_SOCIAL_LOGINS.map((l) => [l.id, { password: "demo-password-not-real", notes: l.status === "not_working" ? "Codes go to my phone" : "" }]),
);

export const DEMO_SOCIAL_EVENTS: SocialLoginEvent[] = DEMO_SOCIAL_LOGINS.flatMap((l, i) => {
  const saved: SocialLoginEvent = { id: 500 + i * 2, login_id: l.id, org_id: l.org_id, actor_id: null, action: "saved", detail: `${l.platform} · ${l.username}`, created_at: l.created_at };
  if (!l.last_revealed_by || !l.last_revealed_at) return [saved];
  return [saved, { id: 501 + i * 2, login_id: l.id, org_id: l.org_id, actor_id: l.last_revealed_by, action: "revealed", detail: `${l.platform} · ${l.username}`, created_at: l.last_revealed_at }];
});
