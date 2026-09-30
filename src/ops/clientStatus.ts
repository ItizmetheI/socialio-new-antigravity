import type { ClientOnboarding, Plan, Proposal, Request } from "../lib/database.types";

export type ClientStatus = { label: string; tone: "ours" | "theirs" | "good" | "idle" };

// One chip per client saying whose move it is, in the stage colours:
// blue = our move, amber = waiting on the client, green = on track.
export const STATUS_TONE: Record<ClientStatus["tone"], string> = {
  ours: "bg-blue-500/10 text-blue-300 light:text-blue-700",
  theirs: "bg-amber-400/10 text-amber-300 light:text-amber-700",
  good: "bg-emerald-500/10 text-emerald-300 light:text-emerald-700",
  idle: "bg-slate-400/10 text-slate-300 light:text-slate-600",
};

export const STATUS_DOT: Record<ClientStatus["tone"], string> = {
  ours: "bg-blue-500",
  theirs: "bg-amber-400",
  good: "bg-emerald-500",
  idle: "bg-slate-400",
};

export function clientStatus(
  onboarding: ClientOnboarding | null | undefined,
  plan: Plan | null | undefined,
  proposal: Proposal | null | undefined,
  openRequests: Pick<Request, "stage">[],
): ClientStatus {
  if (!onboarding || onboarding.status === "not_started" || onboarding.status === "in_progress") {
    return { label: "Waiting on their brief", tone: "theirs" };
  }
  if (onboarding.status === "submitted") return { label: "Review their brief", tone: "ours" };
  if (plan) {
    if (plan.status === "draft") return { label: "Finish their plan", tone: "ours" };
    if (plan.status === "changes_requested") return { label: "Revise their plan", tone: "ours" };
    if (plan.status === "sent" || plan.status === "viewed") return { label: "Plan with client", tone: "theirs" };
  } else if (!proposal || proposal.status === "rejected") {
    return { label: "Build their plan", tone: "ours" };
  } else if (proposal.status === "pending") {
    return { label: "Proposal with client", tone: "theirs" };
  }
  const inReview = openRequests.filter((r) => r.stage === "review").length;
  if (inReview > 0) return { label: `${inReview} with client to review`, tone: "theirs" };
  if (openRequests.length > 0) return { label: `${openRequests.length} in the works`, tone: "good" };
  return { label: "Nothing open", tone: "idle" };
}
