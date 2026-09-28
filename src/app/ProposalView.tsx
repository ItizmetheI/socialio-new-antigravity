import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDollars } from "../lib/format";
import { servicesData } from "../data/services";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PageHeader from "../components/workspace/PageHeader";
import ProposalStatusBadge from "../components/StatusBadge";
import type { Proposal, ProposalItem } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

export default function ProposalView() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadProposal = useCallback(async () => {
    setState("loading");
    const { data: proposalData, error: proposalError } = await supabase
      .from("proposals")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (proposalError) {
      setState("error");
      return;
    }
    if (!proposalData) {
      setProposal(null);
      setItems([]);
      setState("ready");
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposalData.id);

    if (itemsError) {
      setState("error");
      return;
    }

    setProposal(proposalData as Proposal);
    setItems((itemsData ?? []) as ProposalItem[]);
    setState("ready");
  }, [orgId]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const respond = async (status: "approved" | "rejected") => {
    if (!proposal) return;
    setIsResponding(true);
    setActionError("");
    const { error } = await supabase
      .from("proposals")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", proposal.id);
    setIsResponding(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadProposal();
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <ErrorBanner message="Couldn't load your proposal. Try refreshing." />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div>
        <EmptyState
          title="No proposal yet"
          description="Once we've scoped your work, it'll show up here for review."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Your proposal"
        description="The scope and pricing we put together for you."
        action={<ProposalStatusBadge status={proposal.status} />}
      />

      <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden mb-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start justify-between gap-4 px-5 md:px-8 py-5 md:py-6 ${
              index !== items.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="font-bold text-white break-words">{item.tier_label}</div>
              <div className="text-sm text-on-surface-variant">
                {servicesData.find((s) => s.id === item.service_id)?.title ?? item.service_id}
              </div>
            </div>
            <div className="font-bold text-white shrink-0">{formatDollars(item.price)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-5 md:py-6 bg-white/[0.02]">
          <div className="font-bold text-white">Total</div>
          <div className="font-bold text-xl text-primary">{formatDollars(proposal.total_price)}</div>
        </div>
      </div>

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {proposal.status === "pending" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => respond("approved")}
            disabled={isResponding}
            className="btn-primary flex-1"
          >
            Approve
          </button>
          <button
            onClick={() => respond("rejected")}
            disabled={isResponding}
            className="btn-secondary flex-1"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
