import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ProposalStatusBadge, { PlanStatusBadge } from "../components/StatusBadge";
import type { Organization, Proposal, Plan } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

type ClientRow = {
  org: Organization;
  latestPlan: Plan | null;
  latestProposal: Proposal | null;
};

export default function ClientsList() {
  const [state, setState] = useState<LoadState>("loading");
  const [rows, setRows] = useState<ClientRow[]>([]);

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("created_at", { ascending: false }),
      supabase.from("proposals").select("*").order("created_at", { ascending: false }),
    ]).then(([orgsRes, plansRes, proposalsRes]) => {
      if (!isMounted) return;
      if (orgsRes.error || plansRes.error || proposalsRes.error) {
        setState("error");
        return;
      }
      const organizations = (orgsRes.data ?? []) as Organization[];
      const plans = (plansRes.data ?? []) as Plan[];
      const proposals = (proposalsRes.data ?? []) as Proposal[];
      const clientRows = organizations.map((org) => ({
        org,
        latestPlan: plans.find((p) => p.org_id === org.id && p.status !== "superseded") ?? null,
        latestProposal: proposals.find((p) => p.org_id === org.id) ?? null,
      }));
      setRows(clientRows);
      setState("ready");
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
        <ErrorBanner message="Couldn't load clients. Try refreshing." />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-10">
        <EmptyState title="No clients yet" description="New organizations show up here once created in Admin." />
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Clients</h1>
      <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden">
        {rows.map(({ org, latestPlan, latestProposal }, index) => (
          <div
            key={org.id}
            className={`flex items-center justify-between px-8 py-6 ${
              index !== rows.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div>
              <div className="font-bold text-white">{org.name}</div>
              <div className="text-xs text-on-surface-variant">
                Joined {new Date(org.created_at).toLocaleDateString()}
              </div>
            </div>
            {latestPlan ? (
              <PlanStatusBadge status={latestPlan.status} />
            ) : latestProposal ? (
              <ProposalStatusBadge status={latestProposal.status} />
            ) : (
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wide">
                No plan yet
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
