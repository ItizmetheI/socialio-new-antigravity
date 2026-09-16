import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { servicesData } from "../data/services";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
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
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-10">
        <ErrorBanner message="Couldn't load your proposal. Try refreshing." />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-10">
        <EmptyState
          title="No proposal yet"
          description="Once we've scoped your work, it'll show up here for review."
        />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="hero-display font-bold text-3xl text-white">Your proposal</h1>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden mb-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between px-8 py-6 ${
              index !== items.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div>
              <div className="font-bold text-white">{item.tier_label}</div>
              <div className="text-sm text-on-surface-variant">
                {servicesData.find((s) => s.id === item.service_id)?.title ?? item.service_id}
              </div>
            </div>
            <div className="font-bold text-white">${item.price.toLocaleString()}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02]">
          <div className="font-bold text-white">Total</div>
          <div className="font-bold text-xl text-primary">${proposal.total_price.toLocaleString()}</div>
        </div>
      </div>

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {proposal.status === "pending" && (
        <div className="flex gap-4">
          <button
            onClick={() => respond("approved")}
            disabled={isResponding}
            className="flex-1 py-4 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => respond("rejected")}
            disabled={isResponding}
            className="flex-1 py-4 border border-white/20 text-white hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
