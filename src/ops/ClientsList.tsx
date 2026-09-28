import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ProposalStatusBadge, { PlanStatusBadge } from "../components/StatusBadge";
import PageHeader from "../components/workspace/PageHeader";
import { formatDate } from "../lib/format";
import type { Organization, Proposal, Plan, Request } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

type ClientRow = {
  org: Organization;
  latestPlan: Plan | null;
  latestProposal: Proposal | null;
  openCount: number;
  reviewCount: number;
  hasBrandKit: boolean;
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
      supabase.from("requests").select("org_id, stage").neq("stage", "delivered"),
      supabase.from("brand_kits").select("org_id"),
    ]).then(([orgsRes, plansRes, proposalsRes, requestsRes, kitsRes]) => {
      if (!isMounted) return;
      if (orgsRes.error || plansRes.error || proposalsRes.error || requestsRes.error || kitsRes.error) {
        setState("error");
        return;
      }
      const organizations = (orgsRes.data ?? []) as Organization[];
      const plans = (plansRes.data ?? []) as Plan[];
      const proposals = (proposalsRes.data ?? []) as Proposal[];
      const openRequests = (requestsRes.data ?? []) as Pick<Request, "org_id" | "stage">[];
      const kitOrgIds = new Set(((kitsRes.data ?? []) as { org_id: string }[]).map((k) => k.org_id));
      const clientRows = organizations.map((org) => ({
        org,
        latestPlan: plans.find((p) => p.org_id === org.id && p.status !== "superseded") ?? null,
        latestProposal: proposals.find((p) => p.org_id === org.id) ?? null,
        openCount: openRequests.filter((r) => r.org_id === org.id).length,
        reviewCount: openRequests.filter((r) => r.org_id === org.id && r.stage === "review").length,
        hasBrandKit: kitOrgIds.has(org.id),
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <ErrorBanner message="Couldn't load clients. Try refreshing." />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div>
        <EmptyState title="No clients yet" description="New organizations show up here once created in Admin." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Clients" description={`${rows.length} ${rows.length === 1 ? "client" : "clients"}. Open one for their plan, work, brand kit and results.`} />
      {/* Phones: one row per client instead of a sideways-scrolling table. */}
      <ul className="md:hidden divide-y divide-white/10 border-y border-white/10">
        {rows.map(({ org, latestPlan, latestProposal, openCount, reviewCount }) => (
          <li key={org.id}>
            <Link to={`/ops/clients/${org.id}`} className="flex items-center justify-between gap-4 py-4 group">
              <span className="min-w-0">
                <span className="block font-bold text-white group-hover:text-primary transition-colors truncate">{org.name}</span>
                <span className="block text-xs text-on-surface-variant">
                  {openCount} open{reviewCount ? ` · ${reviewCount} in review` : ""}
                </span>
              </span>
              <span className="shrink-0">
                {latestPlan ? (
                  <PlanStatusBadge status={latestPlan.status} />
                ) : latestProposal ? (
                  <ProposalStatusBadge status={latestProposal.status} />
                ) : (
                  <span className="text-xs text-on-surface-variant">No plan yet</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[40rem]">
          <thead>
            <tr className="text-left text-xs text-on-surface-variant border-b border-white/10">
              <th className="pb-3 font-normal">Client</th>
              <th className="pb-3 font-normal text-right">Open work</th>
              <th className="pb-3 font-normal text-right">In client review</th>
              <th className="pb-3 pl-6 font-normal">Brand kit</th>
              <th className="pb-3 font-normal text-right">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map(({ org, latestPlan, latestProposal, openCount, reviewCount, hasBrandKit }) => (
              <tr key={org.id} className="group">
                <td className="py-4 pr-4">
                  <Link to={`/ops/clients/${org.id}`} className="font-bold text-white group-hover:text-primary transition-colors">
                    {org.name}
                  </Link>
                  <div className="text-xs text-on-surface-variant">Joined {formatDate(org.created_at)}</div>
                </td>
                <td className="py-4 text-right text-white">{openCount}</td>
                <td className={`py-4 text-right ${reviewCount ? "text-primary font-bold" : "text-on-surface-variant"}`}>{reviewCount}</td>
                <td className={`py-4 pl-6 ${hasBrandKit ? "text-white" : "text-on-surface-variant"}`}>{hasBrandKit ? "Filled in" : "Not yet"}</td>
                <td className="py-4 text-right">
                  {latestPlan ? (
                    <PlanStatusBadge status={latestPlan.status} />
                  ) : latestProposal ? (
                    <ProposalStatusBadge status={latestProposal.status} />
                  ) : (
                    <span className="text-xs text-on-surface-variant">No plan yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
