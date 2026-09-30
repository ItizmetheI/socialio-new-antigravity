import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PageHeader from "../components/workspace/PageHeader";
import { formatDate } from "../lib/format";
import InviteClientForm from "./admin/InviteClientForm";
import { STATUS_DOT, STATUS_TONE, clientStatus, type ClientStatus } from "./clientStatus";
import type { ClientOnboarding, Organization, Plan, Proposal, Request } from "../lib/database.types";

type ClientRow = { org: Organization; status: ClientStatus; openCount: number };

const TONE_ORDER: ClientStatus["tone"][] = ["ours", "theirs", "good", "idle"];

// Every client, sorted so the ones waiting on us come first. One chip says
// whose move it is; tap a client for everything else.
export default function ClientsList() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const load = useCallback(async () => {
    const [orgsRes, onboardingRes, plansRes, proposalsRes, requestsRes] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("client_onboarding").select("*"),
      supabase.from("plans").select("*").neq("status", "superseded").order("created_at", { ascending: false }),
      supabase.from("proposals").select("*").order("created_at", { ascending: false }),
      supabase.from("requests").select("org_id, stage").neq("stage", "delivered"),
    ]);
    if (orgsRes.error || onboardingRes.error || plansRes.error || proposalsRes.error || requestsRes.error) {
      setHasError(true);
      return;
    }
    const organizations = (orgsRes.data ?? []) as Organization[];
    const onboardings = (onboardingRes.data ?? []) as ClientOnboarding[];
    const plans = (plansRes.data ?? []) as Plan[];
    const proposals = (proposalsRes.data ?? []) as Proposal[];
    const open = (requestsRes.data ?? []) as Pick<Request, "org_id" | "stage">[];
    setOrgs(organizations);
    setRows(
      organizations
        .map((org) => {
          const mine = open.filter((r) => r.org_id === org.id);
          return {
            org,
            openCount: mine.length,
            status: clientStatus(
              onboardings.find((o) => o.org_id === org.id),
              plans.find((p) => p.org_id === org.id),
              proposals.find((p) => p.org_id === org.id),
              mine,
            ),
          };
        })
        .sort((a, b) => TONE_ORDER.indexOf(a.status.tone) - TONE_ORDER.indexOf(b.status.tone)),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (hasError) return <ErrorBanner message="Couldn't load clients. Try refreshing." />;
  if (!rows) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.org.name.toLowerCase().includes(q)) : rows;

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${rows.length} ${rows.length === 1 ? "client" : "clients"}. Tap one for their plan, brief, work and billing.`}
        action={
          isAdmin && (
            <button type="button" onClick={() => setIsInviteOpen((v) => !v)} className={isInviteOpen ? "btn-secondary" : "btn-primary"}>
              {isInviteOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {isInviteOpen ? "Close" : "Invite client"}
            </button>
          )
        }
      />

      {isInviteOpen && <InviteClientForm orgs={orgs} onInvited={load} />}

      {rows.length === 0 ? (
        <EmptyState title="No clients yet" description={isAdmin ? "Invite your first client to get started." : "Clients show up here once an admin invites them or they check out."} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <label className="relative flex-1 sm:max-w-sm">
              <span className="sr-only">Search clients</span>
              <Search className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients" className="field text-sm pl-10" />
            </label>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant sm:ml-auto">
              {(
                [
                  ["ours", "Our move"],
                  ["theirs", "Waiting on client"],
                  ["good", "On track"],
                ] as const
              ).map(([tone, label]) => (
                <span key={tone} className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[tone]}`} /> {label}
                </span>
              ))}
            </p>
          </div>

          {shown.length === 0 && <p className="text-sm text-on-surface-variant py-6">No clients match.</p>}
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {shown.map(({ org, status, openCount }) => (
              <li key={org.id}>
                <Link to={`/ops/clients/${org.id}`} className="flex items-center gap-4 py-4 group">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white group-hover:text-primary transition-colors truncate">{org.name}</span>
                    <span className="block text-xs text-on-surface-variant">
                      Since {formatDate(org.created_at)} · {openCount} open
                    </span>
                  </span>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_TONE[status.tone]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status.tone]}`} />
                    {status.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
