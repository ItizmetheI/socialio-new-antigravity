import { expect, test } from "vitest";
import { buildAttention } from "./attention";
import type { ClientOnboarding, Comment, ContactSubmission, Plan, Profile, Request } from "../lib/database.types";

const req = (id: string, extra: Partial<Request>) => ({ id, org_id: "o1", title: id, stage: "in_progress", assigned_to: "s1", due_date: null, ...extra }) as Request;

test("builds one list, most urgent first, each linking to where it gets done", () => {
  const items = buildAttention({
    openRequests: [
      req("late", { due_date: "2026-09-01" }),
      req("soon", { due_date: "2026-10-03" }),
      req("orphan", { assigned_to: null }),
      req("with-client", { stage: "review", due_date: "2026-09-01" }),
    ],
    onboardings: [{ id: "ob1", org_id: "o1", status: "submitted", submitted_at: "2026-09-20" } as ClientOnboarding],
    plans: [{ id: "p1", org_id: "o1", status: "sent", version: 1, sent_at: "2026-09-21" } as Plan],
    newLeads: [{ id: "l1", name: "Ana", company: null, created_at: "2026-09-29T00:00:00Z" } as ContactSubmission],
    comments: [
      { id: "c1", request_id: "soon", author_id: "staff", created_at: "2026-09-27T00:00:00Z" } as Comment,
      { id: "c2", request_id: "soon", author_id: "client", created_at: "2026-09-28T00:00:00Z" } as Comment,
    ],
    profiles: [{ id: "client", role: "client" } as Profile, { id: "staff", role: "internal" } as Profile],
    orgName: () => "Acme",
    today: "2026-09-30",
    soon: "2026-10-07",
    formatDate: (v) => v ?? "—",
    timeAgo: () => "1d ago",
  });

  expect(items.map((i) => i.tag)).toEqual([
    "Overdue",
    "Reply to client",
    "Review brief",
    "Unassigned",
    "New lead",
    "Due soon",
    "Plan with client",
    "With client to review",
  ]);
  expect(items[0].to).toBe("/ops/work?item=late");
  expect(items.find((i) => i.tag === "Review brief")?.to).toBe("/ops/clients/o1?section=brief");
  // A piece waiting on the client isn't "overdue" on us.
  expect(items.filter((i) => i.title === "with-client").map((i) => i.tag)).toEqual(["With client to review"]);
});
