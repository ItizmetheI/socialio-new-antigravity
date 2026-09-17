import React from "react";
import type { ProposalStatus, PlanStatus } from "../lib/database.types";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  approved: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  rejected: "bg-red-400/10 text-red-300 border-red-400/20",
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PLAN_STATUS_STYLES: Record<PlanStatus, string> = {
  draft: "bg-white/5 text-on-surface-variant border-white/10",
  sent: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  viewed: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  changes_requested: "bg-orange-400/10 text-orange-300 border-orange-400/20",
  approved: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  superseded: "bg-white/5 text-on-surface-variant border-white/10",
};

const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Draft",
  sent: "Pending review",
  viewed: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  superseded: "Superseded",
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${PLAN_STATUS_STYLES[status]}`}
    >
      {PLAN_STATUS_LABELS[status]}
    </span>
  );
}
