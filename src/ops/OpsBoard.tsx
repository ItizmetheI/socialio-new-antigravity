import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DndContext, useDroppable, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request, RequestStage, Organization } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

function BoardCard({ request, orgName }: { request: Request; orgName: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: request.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-surface-container border border-white/10 rounded-2xl p-4 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="text-xs font-bold text-primary mb-1 truncate">{orgName}</div>
      <Link
        to={`/ops/requests/${request.id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-bold text-white text-sm hover:text-primary transition-colors block mb-1"
      >
        {request.title}
      </Link>
      {request.due_date && (
        <div className="text-xs text-on-surface-variant">Due {new Date(request.due_date).toLocaleDateString()}</div>
      )}
    </div>
  );
}

function BoardColumn({
  stage,
  label,
  requests,
  orgNameById,
}: {
  stage: RequestStage;
  label: string;
  requests: Request[];
  orgNameById: Map<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 rounded-2xl p-3 transition-colors ${isOver ? "bg-primary/5" : ""}`}
    >
      <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">
        {label} <span className="text-white/30">({requests.length})</span>
      </div>
      <div className="flex flex-col gap-3 min-h-[80px]">
        {requests.map((request) => (
          <BoardCard key={request.id} request={request} orgName={orgNameById.get(request.org_id) ?? "—"} />
        ))}
      </div>
    </div>
  );
}

export default function OpsBoard() {
  const [state, setState] = useState<LoadState>("loading");
  const [requests, setRequests] = useState<Request[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("*"),
    ]).then(([requestsRes, orgsRes]) => {
      if (!isMounted) return;
      if (requestsRes.error || orgsRes.error) {
        setState("error");
        return;
      }
      setRequests((requestsRes.data ?? []) as Request[]);
      setOrganizations((orgsRes.data ?? []) as Organization[]);
      setState("ready");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((org) => map.set(org.id, org.name));
    return map;
  }, [organizations]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const requestId = active.id as string;
    const newStage = over.id as RequestStage;
    const current = requests.find((r) => r.id === requestId);
    if (!current || current.stage === newStage) return;

    const previousRequests = requests;
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, stage: newStage } : r)));
    setActionError("");

    const { error } = await supabase.from("requests").update({ stage: newStage }).eq("id", requestId);
    if (error) {
      setRequests(previousRequests);
      setActionError(error.message);
    }
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
        <ErrorBanner message="Couldn't load the board. Try refreshing." />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-10">
        <EmptyState title="No requests yet" description="Requests appear here once a client approves a proposal." />
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Board</h1>
      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {REQUEST_STAGES.map(({ value, label }) => (
            <BoardColumn
              key={value}
              stage={value}
              label={label}
              requests={requests.filter((r) => r.stage === value)}
              orgNameById={orgNameById}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
