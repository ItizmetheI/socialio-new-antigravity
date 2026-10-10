// A minimal stand-in for the handful of supabase-js query-builder methods
// this codebase actually calls (select/eq/in/order/limit/single/maybeSingle/
// insert/update), operating on the in-memory fixtures instead of a network
// request. It's a thenable, same as the real postgrest-js builder, so
// `await supabase.from(...).select().eq(...)` works unmodified in every page
// — no page needs to know test mode exists.
import {
  mockOrganizations,
  mockProfiles,
  mockProposals,
  mockProposalItems,
  mockRequests,
  mockComments,
  mockDeliverables,
  mockClientOnboarding,
  mockPlans,
  mockPlanItems,
  mockPlanFeedback,
  mockPerformanceReports,
  mockActivityEvents,
  mockOrders,
  mockOrderItems,
  mockSubscriptions,
  mockPayments,
} from "./fixtures";
import { getStoredTestIdentityKey, TEST_IDENTITIES } from "./testAuth";
import { demo, DEMO_LEADS, DEMO_NEWSLETTER, DEMO_SOCIAL_EVENTS, DEMO_SOCIAL_LOGINS, DEMO_SOCIAL_SECRETS, DEMO_STAFF_ACCOUNTS } from "./demoCompanies";
import { planForSubscription } from "../subscriptionPlan";
import { formatCents, formatDate } from "../format";
import type { ActivityEvent, Order, OrderItem, SocialLogin, SocialLoginEvent } from "../database.types";

// Demo version of the manage-subscription Edge Function + its database
// trigger: flips cancel_at_period_end and logs the same activity event, so
// the owner's dashboard notice shows up when the demo client cancels.
// Switching demo role reloads the page (fixtures reset), so these changes are
// replayed from sessionStorage: "client cancels -> owner sees it" works.
const DEMO_SUBS_KEY = "socialio-demo-subscription-changes";
type DemoSubChange = { subscriptionId: string; cancel: boolean; event: ActivityEvent };

function readDemoSubChanges(): DemoSubChange[] {
  try {
    return JSON.parse(sessionStorage.getItem(DEMO_SUBS_KEY) ?? "[]") as DemoSubChange[];
  } catch {
    return [];
  }
}

for (const change of readDemoSubChanges()) {
  const sub = mockSubscriptions.find((s) => s.id === change.subscriptionId);
  if (sub) sub.cancel_at_period_end = change.cancel;
  if (!mockActivityEvents.some((e) => e.id === change.event.id)) mockActivityEvents.unshift(change.event);
}

// Demo logins added/changed in this browser tab survive the role switch
// (which reloads the page), so "client adds it -> team sees it" works.
const DEMO_SOCIAL_KEY = "socialio-demo-social-logins";
function saveDemoSocial() {
  try {
    sessionStorage.setItem(
      DEMO_SOCIAL_KEY,
      JSON.stringify({ logins: DEMO_SOCIAL_LOGINS, events: DEMO_SOCIAL_EVENTS, secrets: [...DEMO_SOCIAL_SECRETS] }),
    );
  } catch {
    // storage blocked: changes last until the next reload
  }
}
try {
  const saved = JSON.parse(sessionStorage.getItem(DEMO_SOCIAL_KEY) ?? "null") as {
    logins: SocialLogin[];
    events: SocialLoginEvent[];
    secrets: [string, { password: string; notes: string }][];
  } | null;
  if (saved) {
    DEMO_SOCIAL_LOGINS.splice(0, DEMO_SOCIAL_LOGINS.length, ...saved.logins);
    DEMO_SOCIAL_EVENTS.splice(0, DEMO_SOCIAL_EVENTS.length, ...saved.events);
    DEMO_SOCIAL_SECRETS.clear();
    saved.secrets.forEach(([id, s]) => DEMO_SOCIAL_SECRETS.set(id, s));
  }
} catch {
  // nothing saved
}

let demoVaultUnlocked = false;

// Demo version of the social-access Edge Function. Same rules (clients: own
// org, save/remove only; staff: also reveal + status), but the "vault" is an
// in-memory map of obviously fake passwords.
function mockSocialAccess(body: Record<string, unknown>) {
  const viewer = getStoredTestIdentityKey();
  const me = viewer ? TEST_IDENTITIES[viewer] : null;
  if (!me) return { data: null, error: { message: "Invalid session" } };
  const isStaff = me.role !== "client";
  const logins = DEMO_SOCIAL_LOGINS;
  const now = new Date().toISOString();
  const find = (id: unknown) => logins.find((l) => l.id === id && (isStaff || l.org_id === me.orgId));
  const log = (l: SocialLogin, action: SocialLoginEvent["action"], detail?: string) =>
    DEMO_SOCIAL_EVENTS.unshift({
      id: Math.max(0, ...DEMO_SOCIAL_EVENTS.map((e) => e.id)) + 1,
      login_id: l.id,
      org_id: l.org_id,
      actor_id: me.id,
      action,
      detail: detail ?? `${l.platform} · ${l.username}`,
      created_at: now,
    });

  if (body.action === "save") {
    const fields = {
      platform: body.platform as SocialLogin["platform"],
      label: (body.label as string | null) || null,
      username: String(body.username ?? "").trim(),
    };
    if (!fields.username) return { data: { error: "Enter the username or email you log in with" }, error: null };
    const existing = find(body.id);
    if (existing) {
      Object.assign(existing, fields, { status: "submitted", status_note: null, updated_at: now });
      if (body.password) {
        const oldNotes = DEMO_SOCIAL_SECRETS.get(existing.id)?.notes ?? "";
        DEMO_SOCIAL_SECRETS.set(existing.id, { password: String(body.password), notes: typeof body.notes === "string" ? body.notes : oldNotes });
      }
      log(existing, "updated");
      return { data: { id: existing.id }, error: null };
    }
    if (!body.password) return { data: { error: "Enter the password" }, error: null };
    const row: SocialLogin = {
      id: nextId("login"),
      org_id: isStaff ? String(body.orgId) : String(me.orgId),
      ...fields,
      status: "submitted",
      status_note: null,
      created_by: me.id,
      created_at: now,
      updated_at: now,
      last_revealed_at: null,
      last_revealed_by: null,
    };
    logins.push(row);
    DEMO_SOCIAL_SECRETS.set(row.id, { password: String(body.password), notes: String(body.notes ?? "") });
    log(row, "saved");
    return { data: { id: row.id }, error: null };
  }

  if (body.action === "unlock") {
    if (!isStaff) return { data: { error: "Only the Socialio team can do that" }, error: null };
    if (!body.password) return { data: { error: "That password isn't right." }, error: null };
    demoVaultUnlocked = true; // demo: any password works
    return { data: { unlocked_until: new Date(Date.now() + 600000).toISOString() }, error: null };
  }
  const row = find(body.id);
  if (!row) return { data: { error: "Login not found" }, error: null };
  if (body.action === "remove") {
    log(row, "removed");
    logins.splice(logins.indexOf(row), 1);
    return { data: { ok: true }, error: null };
  }
  if (!isStaff) return { data: { error: "Only the Socialio team can do that" }, error: null };
  if (body.action === "reveal") {
    if (!demoVaultUnlocked) return { data: { error: "Confirm your password to open the vault.", code: "vault_locked" }, error: null };
    row.last_revealed_at = now;
    row.last_revealed_by = me.id;
    log(row, "revealed");
    return { data: DEMO_SOCIAL_SECRETS.get(row.id) ?? { password: "demo-password-not-real", notes: "" }, error: null };
  }
  if (body.action === "set_status") {
    row.status = body.status as SocialLogin["status"];
    row.status_note = (body.note as string) || null;
    log(row, "status", `${row.platform}: ${row.status}`);
    return { data: { ok: true }, error: null };
  }
  return { data: { error: "Unknown action" }, error: null };
}

function mockManageSubscription(body: { subscriptionId?: string; action?: string }) {
  const sub = mockSubscriptions.find((s) => s.id === body.subscriptionId);
  if (!sub || (body.action !== "cancel" && body.action !== "resume")) {
    return { data: null, error: { message: "Subscription not found" } };
  }
  const isCancel = body.action === "cancel";
  if (sub.cancel_at_period_end !== isCancel) {
    sub.cancel_at_period_end = isCancel;
    sub.updated_at = new Date().toISOString();
    const plan = planForSubscription(sub, mockOrders as Order[], mockOrderItems as OrderItem[]);
    const label = `${plan.label} (${formatCents(plan.monthlyCents, plan.currency)}/month)`;
    const until = sub.current_period_end ? formatDate(sub.current_period_end) : "the end of the paid month";
    const event: ActivityEvent = {
      id: Math.max(0, ...mockActivityEvents.map((e) => e.id)) + 1,
      org_id: sub.org_id,
      actor_id: null,
      kind: isCancel ? "subscription_canceling" : "subscription_resumed",
      request_id: null,
      summary: isCancel
        ? `Cancelled: ${label}. Stays active until ${until}, no further charges`
        : `Cancellation undone: ${label} keeps renewing monthly`,
      is_internal: false,
      created_at: new Date().toISOString(),
    };
    mockActivityEvents.unshift(event);
    try {
      sessionStorage.setItem(DEMO_SUBS_KEY, JSON.stringify([...readDemoSubChanges(), { subscriptionId: sub.id, cancel: isCancel, event }]));
    } catch {
      // storage blocked: the change lasts until the next reload
    }
  }
  return {
    data: { cancel_at_period_end: sub.cancel_at_period_end, current_period_end: sub.current_period_end, status: sub.status },
    error: null,
  };
}

type Row = Record<string, unknown>;
type MockResult = { data: unknown; error: { message: string } | null };

const TABLES: Record<string, Row[]> = {
  organizations: mockOrganizations as unknown as Row[],
  profiles: mockProfiles as unknown as Row[],
  proposals: mockProposals as unknown as Row[],
  proposal_items: mockProposalItems as unknown as Row[],
  requests: mockRequests as unknown as Row[],
  comments: mockComments as unknown as Row[],
  deliverables: mockDeliverables as unknown as Row[],
  client_onboarding: mockClientOnboarding as unknown as Row[],
  plans: mockPlans as unknown as Row[],
  plan_items: mockPlanItems as unknown as Row[],
  plan_feedback: mockPlanFeedback as unknown as Row[],
  orders: mockOrders as unknown as Row[],
  order_items: mockOrderItems as unknown as Row[],
  subscriptions: mockSubscriptions as unknown as Row[],
  payments: mockPayments as unknown as Row[],
  // Insert-only tables with no fixture backstory needed — an empty table is
  // the realistic starting state, and it lets these forms actually "succeed"
  // in test mode instead of failing on an unregistered table.
  onboarding_assets: [],
  contact_submissions: DEMO_LEADS as unknown as Row[],
  newsletter_signups: DEMO_NEWSLETTER as unknown as Row[],
  brand_kits: [],
  performance_reports: mockPerformanceReports as unknown as Row[],
  activity_events: mockActivityEvents as unknown as Row[],
  activity_reads: [],
  social_logins: DEMO_SOCIAL_LOGINS as unknown as Row[],
  social_login_events: DEMO_SOCIAL_EVENTS as unknown as Row[],
};

// Column defaults the real schema fills in on insert.
const INSERT_DEFAULTS: Record<string, Row> = {
  requests: { order_item_id: null, units: 1 },
};

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

type Filter = { col: string; op: "eq" | "neq" | "in" | "gte" | "lte"; val: unknown };

class MockQueryBuilder implements PromiseLike<MockResult> {
  private readonly table: string;
  private filters: Filter[] = [];
  private orderCol?: string;
  private orderAscending = true;
  private limitCount?: number;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private conflictCols: string[] = [];
  private payload?: Row | Row[];
  private singleFlag = false;
  private maybeSingleFlag = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string) {
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: "in", val: vals });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ col, op: "gte", val });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ col, op: "lte", val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAscending = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.singleFlag = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleFlag = true;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = payload;
    this.conflictCols = (opts?.onConflict ?? "id").split(",").map((c) => c.trim());
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every(({ col, op, val }) => {
      if (op === "eq") return row[col] === val;
      if (op === "neq") return row[col] !== val;
      if (op === "in") return (val as unknown[]).includes(row[col]);
      if (op === "gte") return (row[col] as string | number) >= (val as string | number);
      if (op === "lte") return (row[col] as string | number) <= (val as string | number);
      return true;
    });
  }

  private run(): MockResult {
    const store = TABLES[this.table];
    if (!store) {
      return { data: null, error: { message: `Unknown mock table "${this.table}"` } };
    }

    if (this.mode === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inserted = rows.map((row) => ({
        id: nextId(this.table),
        created_at: new Date().toISOString(),
        ...INSERT_DEFAULTS[this.table],
        ...row,
      }));
      store.push(...inserted);
      return { data: this.singleFlag ? inserted[0] : inserted, error: null };
    }

    if (this.mode === "update") {
      const matched = store.filter((row) => this.matches(row));
      matched.forEach((row) => Object.assign(row, this.payload, { updated_at: new Date().toISOString() }));
      return { data: this.singleFlag ? matched[0] ?? null : matched, error: null };
    }

    if (this.mode === "upsert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const saved = rows.map((row) => {
        const existing = store.find((r) => this.conflictCols.every((c) => r[c] === row[c]));
        if (existing) return Object.assign(existing, row, { updated_at: new Date().toISOString() });
        const inserted = { id: nextId(this.table), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row };
        store.push(inserted);
        return inserted;
      });
      return { data: this.singleFlag ? saved[0] : saved, error: null };
    }

    if (this.mode === "delete") {
      const remaining = store.filter((row) => !this.matches(row));
      store.splice(0, store.length, ...remaining);
      return { data: [], error: null };
    }

    let rows = store.filter((row) => this.matches(row));
    // Real RLS hides staff-only comments from clients (schema.sql: "clients
    // read own org client-visible comments" requires visibility='client').
    // The mock has no RLS layer at all, so without this, test mode leaks
    // internal notes into the client view — replicate just this one rule
    // rather than simulating RLS generally.
    // Same idea for the activity feed: clients never see internal events.
    if (this.table === "comments" || this.table === "activity_events") {
      const identityKey = getStoredTestIdentityKey();
      const role = identityKey ? TEST_IDENTITIES[identityKey].role : null;
      if (role === "client") {
        rows = rows.filter((row) => (this.table === "comments" ? row.visibility === "client" : !row.is_internal));
      }
    }
    // And the one rule every client table shares: a client only ever sees
    // their own org (plus staff names), never another demo company's rows.
    const viewer = getStoredTestIdentityKey();
    if (viewer && TEST_IDENTITIES[viewer].role === "client") {
      const ownOrg = TEST_IDENTITIES[viewer].orgId;
      if (this.table === "organizations") rows = rows.filter((row) => row.id === ownOrg);
      else if (this.table === "profiles") rows = rows.filter((row) => row.org_id === ownOrg || row.role !== "client");
      else rows = rows.filter((row) => !("org_id" in row) || row.org_id === ownOrg);
    }
    if (this.orderCol) {
      const col = this.orderCol;
      const dir = this.orderAscending ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[col] as string | number;
        const bv = b[col] as string | number;
        return av > bv ? dir : av < bv ? -dir : 0;
      });
    }
    if (this.limitCount != null) rows = rows.slice(0, this.limitCount);

    if (this.singleFlag) {
      return rows.length === 1
        ? { data: rows[0], error: null }
        : { data: null, error: { message: "Row not found" } };
    }
    if (this.maybeSingleFlag) {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then<TResult1 = MockResult, TResult2 = never>(
    onfulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

export const mockSupabaseClient = {
  from(table: string) {
    return new MockQueryBuilder(table);
  },
  // Only admin_user_directory() is called; like the real function it refuses
  // anyone who isn't an admin.
  rpc: async (name: string): Promise<MockResult> => {
    if (name !== "admin_user_directory") return { data: null, error: { message: `Unmocked rpc "${name}"` } };
    const key = getStoredTestIdentityKey();
    if (!key || TEST_IDENTITIES[key].role !== "admin") return { data: null, error: { message: "admin only" } };
    const data = Object.values(TEST_IDENTITIES).map((who, i) => ({
      id: who.id,
      email: who.email,
      full_name: who.fullName,
      role: who.role,
      org_id: who.orgId,
      is_active: true,
      created_at: new Date(Date.UTC(2026, 6, 1 + i * 9)).toISOString(),
      email_confirmed_at: new Date(Date.UTC(2026, 6, 1 + i * 9)).toISOString(),
      last_sign_in_at: new Date(Date.now() - (i + 1) * 5400000).toISOString(),
      providers: i === 1 ? ["email", "google"] : ["email"],
    }));
    const known = new Set(data.map((d) => d.id));
    const more = [...DEMO_STAFF_ACCOUNTS, ...demo.accounts]
      .filter((a) => !known.has(a.id))
      .map((a) => ({ ...a, is_active: true, email_confirmed_at: a.created_at, providers: ["email"] }));
    return { data: [...data, ...more], error: null };
  },
  storage: {
    from(_bucket: string) {
      return {
        // No real Storage bucket exists until Phase 5 — a preview upload
        // just succeeds so the deliverable insert that follows it can run.
        upload: async (path: string, _file: File) => ({ data: { path }, error: null }),
        // No real files exist in test mode — links resolve to a blank page.
        createSignedUrls: async (paths: string[], _expiresIn: number) => ({
          data: paths.map((path) => ({ path, signedUrl: `about:blank#${encodeURIComponent(path)}`, error: null })),
          error: null,
        }),
      };
    },
  },
  functions: {
    invoke: async (name: string, options?: { body?: Record<string, unknown> }) => {
      if (name === "social-access") {
        const result = mockSocialAccess((options?.body ?? {}) as Record<string, unknown>);
        saveDemoSocial();
        return result;
      }
      if (name === "manage-subscription") {
        return mockManageSubscription((options?.body ?? {}) as { subscriptionId?: string; action?: string });
      }
      if (name !== "invite-client") {
        return { data: null, error: { message: `Unmocked function "${name}"` } };
      }
      const body = (options?.body ?? {}) as {
        email?: string;
        fullName?: string;
        role?: string;
        orgId?: string;
        orgName?: string;
      };
      let orgId = body.orgId ?? null;
      if (body.role === "client" && !orgId) {
        const newOrg = {
          id: nextId("org"),
          name: body.orgName ?? "New client",
          stripe_customer_id: null,
          status: "prospect" as const,
          created_at: new Date().toISOString(),
        };
        mockOrganizations.push(newOrg);
        orgId = newOrg.id;
      }
      if (body.role === "internal" || body.role === "admin") {
        mockProfiles.push({
          id: nextId("staff"),
          org_id: null,
          role: body.role,
          full_name: body.fullName ?? body.email ?? "New teammate",
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
      return { data: { userId: nextId("user"), orgId }, error: null };
    },
  },
};
