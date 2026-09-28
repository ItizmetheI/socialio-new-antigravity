import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import RequestCard from "../components/workspace/RequestCard";
import RequestFilterBar from "../components/workspace/RequestFilterBar";
import { EMPTY_FILTERS, filterRequests } from "../components/workspace/requestMeta";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";
import { useAuth } from "../lib/auth/AuthContext";
import NewRequestForm from "./NewRequestForm";

type LoadState = "loading" | "error" | "ready";

export default function RequestBoard() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [requests, setRequests] = useState<Request[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    supabase
      .from("requests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setState("error");
          return;
        }
        setRequests((data ?? []) as Request[]);
        setState("ready");
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  if (state === "loading") {
    return (
      <div className="p-5 md:p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-5 md:p-10">
        <ErrorBanner message="Couldn't load your pipeline. Try refreshing." />
      </div>
    );
  }

  const visible = filterRequests(requests, filters);
  const count = (stage: Request["stage"]) => requests.filter((r) => r.stage === stage).length;
  const stats = [
    { label: "Active", value: requests.length - count("delivered"), note: "Not yet delivered" },
    { label: "In production", value: count("in_progress"), note: "Being made now" },
    { label: "Needs your review", value: count("review"), note: "Waiting on you", isAccent: count("review") > 0 },
    { label: "Delivered", value: count("delivered"), note: "Done & approved" },
  ];

  return (
    <div className="p-5 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="hero-display font-bold text-3xl text-white mb-1">Pipeline</h1>
          <p className="text-on-surface-variant text-sm">Every piece of work, from brief to delivered.</p>
        </div>
        {!isFormOpen && profile && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-background hover:bg-primary hover:text-[#fff] rounded-xl font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New request
          </button>
        )}
      </div>

      {isFormOpen && profile && (
        <NewRequestForm
          orgId={orgId}
          profileId={profile.id}
          onCancel={() => setIsFormOpen(false)}
          onCreated={(created) => {
            setRequests((current) => [created, ...current]);
            setIsFormOpen(false);
          }}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl p-5 border ${s.isAccent ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface-container"}`}
          >
            <div className={`text-3xl font-bold mb-1 ${s.isAccent ? "text-primary" : "text-white"}`}>{s.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{s.label}</div>
            <div className="text-xs text-on-surface-variant/70 mt-1">{s.note}</div>
          </div>
        ))}
      </div>

      {requests.length === 0 && !isFormOpen ? (
        <EmptyState
          title="No work yet"
          description="Send us your first request, or wait for work from your approved plan to show up here."
        />
      ) : (
        <>
          <RequestFilterBar value={filters} onChange={setFilters} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {REQUEST_STAGES.map(({ value, label }) => {
              const stageRequests = visible.filter((r) => r.stage === value);
              return (
                <section key={value} className="rounded-2xl bg-white/[0.02] border border-white/5 p-3">
                  <h2 className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1 mb-3">
                    {label}
                    <span className="text-white/40">{stageRequests.length}</span>
                  </h2>
                  <div className="flex flex-col gap-3">
                    {stageRequests.length === 0 && <p className="text-xs text-on-surface-variant/60 px-1 py-4">Nothing here.</p>}
                    {stageRequests.map((request) => (
                      <RequestCard key={request.id} request={request} to={`/app/requests/${request.id}`} highlightReview />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
