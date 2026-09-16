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
} from "./fixtures";

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
};

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

type Filter = { col: string; op: "eq" | "in"; val: unknown };

class MockQueryBuilder implements PromiseLike<MockResult> {
  private readonly table: string;
  private filters: Filter[] = [];
  private orderCol?: string;
  private orderAscending = true;
  private limitCount?: number;
  private mode: "select" | "insert" | "update" = "select";
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

  in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: "in", val: vals });
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

  private matches(row: Row): boolean {
    return this.filters.every(({ col, op, val }) => {
      if (op === "eq") return row[col] === val;
      if (op === "in") return (val as unknown[]).includes(row[col]);
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
        ...row,
      }));
      store.push(...inserted);
      return { data: this.singleFlag ? inserted[0] : inserted, error: null };
    }

    if (this.mode === "update") {
      const matched = store.filter((row) => this.matches(row));
      matched.forEach((row) => Object.assign(row, this.payload));
      return { data: matched, error: null };
    }

    let rows = store.filter((row) => this.matches(row));
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
  storage: {
    from(_bucket: string) {
      return {
        // No real Storage bucket exists until Phase 5 — a preview upload
        // just succeeds so the deliverable insert that follows it can run.
        upload: async (path: string, _file: File) => ({ data: { path }, error: null }),
      };
    },
  },
  functions: {
    invoke: async (name: string, options?: { body?: Record<string, unknown> }) => {
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
