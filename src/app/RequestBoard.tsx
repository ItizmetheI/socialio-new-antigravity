import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import RequestCard from "../components/workspace/RequestCard";
import RequestFilterBar from "../components/workspace/RequestFilterBar";
import PageHeader from "../components/workspace/PageHeader";
import StatStrip from "../components/workspace/StatStrip";
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

  const [liveTick, setLiveTick] = useState(0);
  useLiveRefresh(["requests"], () => setLiveTick((t) => t + 1), `org_id=eq.${orgId}`);
  useEffect(() => {
    let isMounted = true;
    if (liveTick === 0) setState("loading");
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
  }, [orgId, liveTick]);

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
        <ErrorBanner message="Couldn't load your pipeline. Try refreshing." />
      </div>
    );
  }

  const visible = filterRequests(requests, filters);
  const count = (stage: Request["stage"]) => requests.filter((r) => r.stage === stage).length;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Every piece of work, from brief to delivered."
        action={
          !isFormOpen &&
          profile && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> New request
            </button>
          )
        }
      />

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

      <StatStrip
        stats={[
          { label: "Active", value: requests.length - count("delivered") },
          { label: "In production", value: count("in_progress") },
          { label: "Needs your review", value: count("review"), isAccent: count("review") > 0 },
          { label: "Delivered", value: count("delivered") },
        ]}
      />

      {requests.length === 0 && !isFormOpen ? (
        <EmptyState
          title="No work yet"
          description="Send us your first request, or wait for work from your approved plan to show up here."
        />
      ) : (
        <>
          <RequestFilterBar value={filters} onChange={setFilters} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8">
            {REQUEST_STAGES.map(({ value, label }) => {
              const stageRequests = visible.filter((r) => r.stage === value);
              return (
                <section key={value}>
                  <h2 className="flex items-center justify-between text-sm font-bold text-white pb-2 mb-3 border-b border-white/10">
                    {label}
                    <span className="text-xs font-normal text-on-surface-variant">{stageRequests.length}</span>
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {stageRequests.length === 0 && <p className="text-xs text-on-surface-variant/70 py-2">Nothing here.</p>}
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
