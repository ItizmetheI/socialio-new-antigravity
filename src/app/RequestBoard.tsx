import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

export default function RequestBoard() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [requests, setRequests] = useState<Request[]>([]);

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
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-10">
        <ErrorBanner message="Couldn't load your requests. Try refreshing." />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-10">
        <EmptyState
          title="No requests yet"
          description="Once your proposal is approved, work items will show up here."
        />
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Requests</h1>
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
                        Due {new Date(request.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
