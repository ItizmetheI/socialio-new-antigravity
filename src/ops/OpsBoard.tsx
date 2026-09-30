import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DndContext, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { supabase } from "../lib/supabase";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import RequestCard from "../components/workspace/RequestCard";
import RequestFilterBar from "../components/workspace/RequestFilterBar";
import PageHeader from "../components/workspace/PageHeader";
import { EMPTY_FILTERS, filterRequests } from "../components/workspace/requestMeta";
import { REQUEST_STAGES } from "../lib/database.types";
import { STAGE_STYLE } from "../components/workspace/stageStyle";
import type { Request, RequestStage, Organization, Profile } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

function BoardCard({ request, orgName, assigneeName }: { request: Request; orgName: string; assigneeName?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: request.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-60" : ""}`}>
      <RequestCard request={request} to={`/ops/requests/${request.id}`} orgName={orgName} assigneeName={assigneeName} />
    </div>
  );
}

function BoardColumn({ stage, label, children, count }: { stage: RequestStage; label: string; children: ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} className={`rounded-xl transition-colors ${isOver ? "bg-primary/5" : ""}`}>
      <h2 className={`flex items-center gap-2 text-sm font-bold pb-2.5 mb-3 border-b-2 ${STAGE_STYLE[stage].text} ${STAGE_STYLE[stage].underline}`}>
        <span className={`w-2 h-2 rounded-full ${STAGE_STYLE[stage].dot}`} />
        {label}
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${STAGE_STYLE[stage].tint}`}>{count}</span>
      </h2>
      <div className="flex flex-col gap-2.5 min-h-[80px]">{children}</div>
    </section>
  );
}

export default function OpsBoard() {
  const [state, setState] = useState<LoadState>("loading");
  const [requests, setRequests] = useState<Request[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [actionError, setActionError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // A drag ends with a click on the card underneath; swallow that one so
  // dropping a card doesn't also open it.
  const justDragged = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [liveTick, setLiveTick] = useState(0);
  useLiveRefresh(["requests"], () => setLiveTick((t) => t + 1));
  useEffect(() => {
    let isMounted = true;
    if (liveTick === 0) setState("loading");
    Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("*").order("name"),
      supabase.from("profiles").select("*").in("role", ["internal", "admin"]),
    ]).then(([requestsRes, orgsRes, staffRes]) => {
      if (!isMounted) return;
      if (requestsRes.error || orgsRes.error) {
        setState("error");
        return;
      }
      setRequests((requestsRes.data ?? []) as Request[]);
      setOrganizations((orgsRes.data ?? []) as Organization[]);
      setStaff((staffRes.data ?? []) as Profile[]);
      setState("ready");
    });
    return () => {
      isMounted = false;
    };
  }, [liveTick]);

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((org) => map.set(org.id, org.name));
    return map;
  }, [organizations]);

  const handleDragEnd = async (event: DragEndEvent) => {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <ErrorBanner message="Couldn't load the board. Try refreshing." />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div>
        <EmptyState title="No requests yet" description="Requests appear here once a client approves a proposal." />
      </div>
    );
  }

  const visible = filterRequests(requests, filters);
  const staffName = (id: string | null) => (id ? staff.find((m) => m.id === id)?.full_name ?? undefined : undefined);

  return (
    <div>
      <PageHeader title="Board" description="Drag a card to move it between stages. Click it to open." />
      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}
      <RequestFilterBar value={filters} onChange={setFilters} orgs={organizations} />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8"
          onClickCapture={(e) => {
            if (justDragged.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {REQUEST_STAGES.map(({ value, label }) => {
            const stageRequests = visible.filter((r) => r.stage === value);
            return (
              <BoardColumn key={value} stage={value} label={label} count={stageRequests.length}>
                {stageRequests.map((request) => (
                  <BoardCard
                    key={request.id}
                    request={request}
                    orgName={orgNameById.get(request.org_id) ?? "—"}
                    assigneeName={staffName(request.assigned_to)}
                  />
                ))}
              </BoardColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
