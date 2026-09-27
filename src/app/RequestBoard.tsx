import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDate } from "../lib/format";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";
import { Plus } from "lucide-react";
import { useAuth } from "../lib/auth/AuthContext";
import NewRequestForm from "./NewRequestForm";

type LoadState = "loading" | "error" | "ready";

export default function RequestBoard() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [requests, setRequests] = useState<Request[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { profile } = useAuth();

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
        <ErrorBanner message="Couldn't load your requests. Try refreshing." />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="hero-display font-bold text-3xl text-white">Requests</h1>
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

      {requests.length === 0 && !isFormOpen && (
        <EmptyState
          title="No requests yet"
          description="Send us your first request, or wait for work from your approved plan to show up here."
        />
      )}

      {requests.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {REQUEST_STAGES.map(({ value, label }) => {
          const stageRequests = requests.filter((r) => r.stage === value);
          return (
            <div key={value} className="flex flex-col gap-3">
              <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">
                {label} <span className="text-white/30">({stageRequests.length})</span>
              </div>
              <div className="flex flex-col gap-3">
                {stageRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/app/requests/${request.id}`}
                    className="bg-surface-container border border-white/10 hover:border-primary/30 rounded-2xl p-5 transition-colors"
                  >
                    <div className="font-bold text-white text-sm mb-1">{request.title}</div>
                    {request.due_date && (
                      <div className="text-xs text-on-surface-variant">
                        Due {formatDate(request.due_date)}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
