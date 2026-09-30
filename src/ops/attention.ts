import type { ClientOnboarding, Comment, ContactSubmission, Plan, Profile, Request } from "../lib/database.types";

// red = late, blue = our move, grey = coming up, amber = waiting on the client.
export type AttentionTone = "late" | "ours" | "soon" | "theirs";

export type AttentionItem = {
  id: string;
  tone: AttentionTone;
  tag: string;
  title: string;
  meta: string;
  to: string;
};

export const TONE_ORDER: AttentionTone[] = ["late", "ours", "soon", "theirs"];

export const TONE_STYLE: Record<AttentionTone, { dot: string; chip: string; label: string }> = {
  late: { dot: "bg-red-500", chip: "bg-red-500/10 text-red-300 light:text-red-700", label: "Late" },
  ours: { dot: "bg-blue-500", chip: "bg-blue-500/10 text-blue-300 light:text-blue-700", label: "Our move" },
  soon: { dot: "bg-slate-400", chip: "bg-slate-400/10 text-slate-300 light:text-slate-600", label: "Coming up" },
  theirs: { dot: "bg-amber-400", chip: "bg-amber-400/10 text-amber-300 light:text-amber-700", label: "Waiting on client" },
};

type Input = {
  openRequests: Request[];
  onboardings: ClientOnboarding[];
  plans: Plan[];
  newLeads: ContactSubmission[];
  comments: Comment[]; // oldest first
  profiles: Profile[];
  orgName: (orgId: string) => string;
  today: string; // local YYYY-MM-DD
  soon: string; // local YYYY-MM-DD, end of the "due soon" window
  formatDate: (value: string | null) => string;
  timeAgo: (iso: string) => string;
};

// Everything someone on the team should look at, as one list, most urgent
// first. Each item links straight to where it gets done.
export function buildAttention(d: Input): AttentionItem[] {
  const items: AttentionItem[] = [];
  const work = (id: string) => `/ops/work?item=${id}`;
  const openById = new Map(d.openRequests.map((r) => [r.id, r]));

  for (const r of d.openRequests) {
    if (r.due_date && r.due_date < d.today && r.stage !== "review") {
      items.push({ id: `late-${r.id}`, tone: "late", tag: "Overdue", title: r.title, meta: `${d.orgName(r.org_id)} · was due ${d.formatDate(r.due_date)}`, to: work(r.id) });
    }
  }

  // A piece needs a reply when its latest comment came from the client.
  const roleById = new Map(d.profiles.map((p) => [p.id, p.role]));
  const latest = new Map<string, Comment>();
  d.comments.forEach((c) => latest.set(c.request_id, c));
  for (const c of latest.values()) {
    const r = openById.get(c.request_id);
    if (r && roleById.get(c.author_id) === "client") {
      items.push({ id: `reply-${c.id}`, tone: "ours", tag: "Reply to client", title: r.title, meta: `${d.orgName(r.org_id)} · ${d.timeAgo(c.created_at)}`, to: work(r.id) });
    }
  }

  for (const o of d.onboardings) {
    if (o.status === "submitted") {
      items.push({ id: `brief-${o.id}`, tone: "ours", tag: "Review brief", title: d.orgName(o.org_id), meta: `sent ${d.formatDate(o.submitted_at)}`, to: `/ops/clients/${o.org_id}?section=brief` });
    }
  }

  for (const p of d.plans) {
    if (p.status === "changes_requested") {
      items.push({ id: `plan-${p.id}`, tone: "ours", tag: "Revise plan", title: d.orgName(p.org_id), meta: `v${p.version} · client asked for changes`, to: `/ops/clients/plan?org=${p.org_id}` });
    } else if (p.status === "sent" || p.status === "viewed") {
      items.push({ id: `plan-${p.id}`, tone: "theirs", tag: "Plan with client", title: d.orgName(p.org_id), meta: `sent ${d.formatDate(p.sent_at)}`, to: `/ops/clients/${p.org_id}?section=plan` });
    }
  }

  for (const r of d.openRequests) {
    if (!r.assigned_to && r.stage !== "review") {
      items.push({ id: `unassigned-${r.id}`, tone: "ours", tag: "Unassigned", title: r.title, meta: d.orgName(r.org_id), to: work(r.id) });
    }
  }

  for (const l of d.newLeads) {
    items.push({ id: `lead-${l.id}`, tone: "ours", tag: "New lead", title: l.name, meta: `${l.company ? `${l.company} · ` : ""}${d.timeAgo(l.created_at)}`, to: "/ops/leads" });
  }

  for (const r of d.openRequests) {
    if (r.due_date && r.due_date >= d.today && r.due_date <= d.soon && r.stage !== "review") {
      items.push({ id: `soon-${r.id}`, tone: "soon", tag: "Due soon", title: r.title, meta: `${d.orgName(r.org_id)} · ${d.formatDate(r.due_date)}`, to: work(r.id) });
    }
    if (r.stage === "review") {
      items.push({ id: `review-${r.id}`, tone: "theirs", tag: "With client to review", title: r.title, meta: d.orgName(r.org_id), to: work(r.id) });
    }
  }

  return items.sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone));
}
