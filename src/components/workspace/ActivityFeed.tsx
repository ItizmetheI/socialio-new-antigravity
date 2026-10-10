import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CheckCircle2, CircleSlash, CreditCard, FileUp, MessageSquare, Plus, RotateCcw, ScrollText, Shuffle, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "../../lib/format";
import { useLiveRefresh } from "../../lib/useLiveRefresh";
import type { ActivityEvent, ActivityKind } from "../../lib/database.types";

const ICONS: Record<ActivityKind, typeof Plus> = {
  request_created: Plus,
  stage_changed: Shuffle,
  comment_added: MessageSquare,
  file_delivered: FileUp,
  plan_sent: ScrollText,
  plan_approved: CheckCircle2,
  plan_changes_requested: ScrollText,
  payment_received: CreditCard,
  subscription_started: BadgeCheck,
  subscription_canceling: XCircle,
  subscription_resumed: RotateCcw,
  subscription_ended: CircleSlash,
};

type Props = {
  // Client pages pass their org; staff pages omit it to see every client.
  orgId?: string;
  limit?: number;
  linkFor: (requestId: string) => string;
  orgNameById?: Map<string, string>;
  emptyText?: string;
};

// Everything that happened, newest first, straight from the trigger-written
// activity log (so it can't drift from what really happened). Updates live.
export default function ActivityFeed({ orgId, limit = 12, linkFor, orgNameById, emptyText = "Nothing yet." }: Props) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    let query = supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(limit);
    if (orgId) query = query.eq("org_id", orgId);
    const { data, error } = await query;
    if (error) {
      setHasError(true);
      return;
    }
    setHasError(false);
    setEvents((data ?? []) as ActivityEvent[]);
  }, [orgId, limit]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(["activity_events"], load, orgId ? `org_id=eq.${orgId}` : undefined);

  if (hasError) return <p className="text-sm text-on-surface-variant">Couldn&apos;t load recent activity.</p>;
  if (events === null) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (events.length === 0) return <p className="text-sm text-on-surface-variant border-y border-white/10 py-4">{emptyText}</p>;

  return (
    <ol className="divide-y divide-white/10 border-y border-white/10">
      {events.map((event) => {
        const Icon = ICONS[event.kind] ?? Shuffle;
        const body = (
          <>
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${event.kind === "payment_received" || event.kind === "plan_approved" ? "text-emerald-500" : "text-primary"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-white break-words">
                {event.summary}
                {event.is_internal && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-500">Internal</span>}
              </span>
              <span className="block text-xs text-on-surface-variant">
                {orgNameById?.get(event.org_id) ? `${orgNameById.get(event.org_id)} · ` : ""}
                {timeAgo(event.created_at)}
              </span>
            </span>
          </>
        );
        return (
          <li key={event.id}>
            {event.request_id ? (
              <Link to={linkFor(event.request_id)} className="flex gap-3 py-3 group hover:bg-white/[0.02] -mx-2 px-2 rounded-lg">
                {body}
              </Link>
            ) : (
              <div className="flex gap-3 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
