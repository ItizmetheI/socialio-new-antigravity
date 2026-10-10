import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { timeAgo } from "../lib/format";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { NOTICE_WINDOW_DAYS, SUBSCRIPTION_KINDS, noticeView, pendingNotices, type NoticeTone } from "../lib/subscriptionPlan";
import type { ActivityEvent } from "../lib/database.types";

// Per admin, per browser: when they last pressed "Got it".
const SEEN_KEY = "socialio-subscription-notices-seen";
const MAX_SHOWN = 3;

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

const TONE: Record<NoticeTone, { bar: string; pill: string }> = {
  good: { bar: "border-l-emerald-500", pill: "bg-emerald-500/15 text-emerald-600" },
  bad: { bar: "border-l-red-500", pill: "bg-red-500/15 text-red-500" },
  neutral: { bar: "border-l-white/30", pill: "bg-white/10 text-on-surface-variant" },
};

// A slim strip on every admin page: new subscriptions and cancellations,
// loud enough to notice, small enough not to push the page down. Live.
export default function SubscriptionNotices() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [orgNames, setOrgNames] = useState<Map<string, string>>(new Map());
  const [seenAt, setSeenAt] = useState<string | null>(readSeen);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - NOTICE_WINDOW_DAYS * 86400000).toISOString();
    const { data } = await supabase
      .from("activity_events")
      .select("*")
      .in("kind", [...SUBSCRIPTION_KINDS])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data ?? []) as ActivityEvent[];
    setEvents(rows);
    const ids = [...new Set(rows.map((e) => e.org_id))];
    if (ids.length) {
      const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", ids);
      setOrgNames(new Map((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name])));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(["activity_events"], load);

  const pending = pendingNotices(events, seenAt);
  if (pending.length === 0) return null;

  const dismiss = () => {
    const newest = pending[0].created_at;
    try {
      localStorage.setItem(SEEN_KEY, newest);
    } catch {
      // private mode: dismissed for this visit only
    }
    setSeenAt(newest);
  };

  return (
    <section aria-label="Subscription updates" className="mb-6 rounded-xl border border-white/10 bg-surface-container overflow-hidden">
      <ul>
        {pending.slice(0, MAX_SHOWN).map((e) => {
          const view = noticeView(e);
          const tone = TONE[view.tone];
          return (
            <li key={e.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-l-4 ${tone.bar} px-4 py-2.5 border-b border-white/5 last:border-b-0`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tone.pill}`}>{view.label}</span>
              <span className="text-sm text-white min-w-0">
                <strong>{orgNames.get(e.org_id) ?? "A client"}</strong>
                <span className="text-on-surface-variant"> · {view.detail}</span>
              </span>
              <span className="text-xs text-on-surface-variant">{timeAgo(e.created_at)}</span>
              <Link to={`/ops/clients/${e.org_id}`} className="text-xs text-primary hover:underline ml-auto">
                Open client
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white/[0.02] text-xs text-on-surface-variant">
        <span>{pending.length > MAX_SHOWN ? `+${pending.length - MAX_SHOWN} more in Admin → Timeline` : "Subscription updates"}</span>
        <button type="button" onClick={dismiss} className="font-bold text-white hover:underline">
          Got it
        </button>
      </div>
    </section>
  );
}
