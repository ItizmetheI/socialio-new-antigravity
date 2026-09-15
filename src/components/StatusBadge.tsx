import React from "react";
import type { ProposalStatus } from "../lib/database.types";

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
