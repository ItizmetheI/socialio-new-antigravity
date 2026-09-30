import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { DndContext, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import SidePanel from "../components/SidePanel";
import RequestCard from "../components/workspace/RequestCard";
import ContentCalendar from "../components/workspace/ContentCalendar";
import PageHeader from "../components/workspace/PageHeader";
import { EMPTY_FILTERS, filterRequests } from "../components/workspace/requestMeta";
import { STAGE_STYLE } from "../components/workspace/stageStyle";
import { CONTENT_FORMATS, PLATFORMS, REQUEST_STAGES } from "../lib/database.types";
import type { ContentFormat, Organization, Platform, Profile, Request, RequestStage } from "../lib/database.types";
import RequestDetail from "./RequestDetail";

type CardProps = { request: Request; to: string; orgName: string; assigneeName?: string };

function DraggableCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.request.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-60" : ""}`}>
      <RequestCard {...props} />
    </div>
  );
}

function Column({ stage, count, children }: { stage: RequestStage; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const style = STAGE_STYLE[stage];
  return (
    <section ref={setNodeRef} className={`min-w-0 rounded-xl transition-colors ${isOver ? "bg-white/[0.03]" : ""}`}>
      <h3 className={`flex items-center gap-2 text-sm font-bold pb-2.5 mb-3 border-b-2 ${style.text} ${style.underline}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        {REQUEST_STAGES.find((s) => s.value === stage)?.label}
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${style.tint}`}>{count}</span>
      </h3>
      <div className="flex flex-col gap-2.5 min-h-[80px]">{children}</div>
    </section>
  );
}

// Every client's work in one place: the pipeline (drag between stages on
// desktop, one stage at a time on phones) and, right under it, the
// publishing calendar — one set of filters drives both.
// Pieces open in a side panel, so you never lose your place.
export default function OpsWork() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [hasError, setHasError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [onlyMine, setOnlyMine] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [phoneStage, setPhoneStage] = useState<RequestStage>("in_progress");
  // A drag ends with a click on the card underneath; swallow that one.
  const justDragged = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const openId = params.get("item");

  const load = useCallback(async () => {
    const [requestsRes, orgsRes, staffRes] = await Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("*").order("name"),
      supabase.from("profiles").select("*").in("role", ["internal", "admin"]),
    ]);
    if (requestsRes.error || orgsRes.error || staffRes.error) {
      setHasError(true);
      return;
    }
    setHasError(false);
    setRequests((requestsRes.data ?? []) as Request[]);
    setOrgs((orgsRes.data ?? []) as Organization[]);
    setStaff((staffRes.data ?? []) as Profile[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(["requests"], load);

  const orgNameById = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);
  const closeItem = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("item");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const { active, over } = event;
    if (!over || !requests) return;
    const requestId = active.id as string;
    const newStage = over.id as RequestStage;
    const current = requests.find((r) => r.id === requestId);
    if (!current || current.stage === newStage) return;
    const previous = requests;
    setRequests(requests.map((r) => (r.id === requestId ? { ...r, stage: newStage } : r)));
    setActionError("");
    const { error } = await supabase.from("requests").update({ stage: newStage }).eq("id", requestId);
    if (error) {
      setRequests(previous);
      setActionError(`Couldn't move that card: ${error.message}`);
    }
  };

  if (hasError) return <ErrorBanner message="Couldn't load the work. Try refreshing." />;
  if (!requests) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const visible = filterRequests(requests, filters).filter((r) => !onlyMine || r.assigned_to === profile?.id);
  // Format/platform sit behind the filter button; light it up when one is set
  // so nothing looks "missing" for no visible reason.
  const hasMoreFilters = !!filters.format || !!filters.platform;
  const inStage = (stage: RequestStage) => visible.filter((r) => r.stage === stage);
  const staffName = (id: string | null) => (id ? staff.find((m) => m.id === id)?.full_name ?? undefined : undefined);
  const itemLink = (id: string) => `?item=${id}`;
  const cardProps = (r: Request): CardProps => ({ request: r, to: itemLink(r.id), orgName: orgNameById.get(r.org_id) ?? "—", assigneeName: staffName(r.assigned_to) });

  return (
    <div>
      <PageHeader
        title="Work"
        description="Every piece for every client: where it stands, and when it's due or goes live. Open one to update it."
      />

      {requests.length === 0 ? (
        <EmptyState title="No work yet" description="Pieces show up here once a client approves a plan or sends a request." />
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-10">
          <div className="flex flex-col md:flex-row gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search</span>
              <Search className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search titles and briefs"
                className="field text-sm pl-10"
              />
            </label>
            <div className="flex gap-2">
              <select aria-label="Client" value={filters.orgId} onChange={(e) => setFilters({ ...filters, orgId: e.target.value })} className="field text-sm flex-1 md:w-auto">
                <option value="">All clients</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setOnlyMine((v) => !v)}
                aria-pressed={onlyMine}
                className={`shrink-0 px-3.5 rounded-xl border text-sm font-bold transition-colors ${
                  onlyMine ? "border-primary bg-primary/10 text-white" : "border-white/10 text-on-surface-variant hover:text-white"
                }`}
              >
                Only mine
              </button>
              <button
                type="button"
                onClick={() => setShowMoreFilters((v) => !v)}
                aria-expanded={showMoreFilters}
                aria-label={hasMoreFilters ? "More filters (some on)" : "More filters"}
                className={`relative shrink-0 px-3 rounded-xl border transition-colors ${
                  hasMoreFilters ? "border-primary bg-primary/10 text-white" : "border-white/10 text-on-surface-variant hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          {showMoreFilters && (
            <div className="grid grid-cols-2 md:flex gap-2">
              <select aria-label="Format" value={filters.format} onChange={(e) => setFilters({ ...filters, format: e.target.value as ContentFormat | "" })} className="field text-sm md:w-auto">
                <option value="">All formats</option>
                {CONTENT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select aria-label="Platform" value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value as Platform | "" })} className="field text-sm md:w-auto">
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          </div>

          {actionError && (
            <div className="mb-6">
              <ErrorBanner message={actionError} />
            </div>
          )}

          <section aria-labelledby="work-pipeline">
            <h2 id="work-pipeline" className="font-bold text-white text-lg mb-5">
              Pipeline
            </h2>

            {/* Phones: pick one stage at a time instead of four long stacked lists. */}
            <div className="md:hidden">
              <div className="grid grid-cols-4 gap-1.5 mb-5" role="tablist" aria-label="Stage">
                {REQUEST_STAGES.map(({ value, label }) => {
                  const style = STAGE_STYLE[value];
                  const isActive = phoneStage === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setPhoneStage(value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-bold transition-colors ${
                        isActive ? `${style.tint} ${style.text} border-current` : "border-white/10 text-on-surface-variant"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {inStage(value).length}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2.5">
                {inStage(phoneStage).length === 0 && <p className="text-sm text-on-surface-variant py-6 text-center">Nothing here.</p>}
                {inStage(phoneStage).map((r) => (
                  <RequestCard key={r.id} {...cardProps(r)} />
                ))}
              </div>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div
                className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8"
                onClickCapture={(e) => {
                  if (justDragged.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {REQUEST_STAGES.map(({ value }) => (
                  <Column key={value} stage={value} count={inStage(value).length}>
                    {inStage(value).map((r) => (
                      <DraggableCard key={r.id} {...cardProps(r)} />
                    ))}
                  </Column>
                ))}
              </div>
            </DndContext>
          </section>

          <section aria-labelledby="work-calendar" className="mt-14 pt-10 border-t border-white/10">
            <h2 id="work-calendar" className="font-bold text-white text-lg mb-1">
              Calendar
            </h2>
            <p className="text-sm text-on-surface-variant mb-6">When each piece is due or goes live, in the same stage colours.</p>
            <ContentCalendar requests={visible} linkFor={itemLink} orgNameById={filters.orgId ? undefined : orgNameById} showPlatformFilter={false} />
          </section>
        </>
      )}

      {openId && (
        <SidePanel label="Work details" onClose={closeItem}>
          <RequestDetail id={openId} onChanged={load} />
        </SidePanel>
      )}
    </div>
  );
}
