import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { timeAgo } from "../lib/format";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import type { ActivityEvent } from "../lib/database.types";

const RECENT = 20;

type Props = {
  userId: string;
  // Where a request link goes and where "see everything" goes, per role.
  linkFor: (requestId: string) => string;
  overviewPath: string;
};

// Unread = activity newer than the user's read marker, excluding things
// they did themselves. Opening the panel marks everything read.
export default function NotificationBell({ userId, linkFor, overviewPath }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [eventsRes, readRes] = await Promise.all([
      supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(RECENT),
      supabase.from("activity_reads").select("seen_at").eq("user_id", userId).maybeSingle(),
    ]);
    if (!eventsRes.error) setEvents((eventsRes.data ?? []) as ActivityEvent[]);
    if (!readRes.error) setSeenAt((readRes.data as { seen_at: string } | null)?.seen_at ?? null);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(["activity_events"], load);

  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [isOpen]);

  const unread = events.filter((e) => e.actor_id !== userId && (!seenAt || e.created_at > seenAt));

  const toggle = async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && unread.length > 0) {
      const now = new Date().toISOString();
      setSeenAt(now);
      await supabase.from("activity_reads").upsert({ user_id: userId, seen_at: now }, { onConflict: "user_id" });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label={unread.length ? `Notifications, ${unread.length} new` : "Notifications"}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[#fff] text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[22rem] bg-surface-container border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-bold text-white">Updates</div>
          {events.length === 0 ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">Nothing yet. Updates on your work show up here.</p>
          ) : (
            <ol className="max-h-[60vh] overflow-y-auto divide-y divide-white/10">
              {events.slice(0, 8).map((e) => {
                const isNew = unread.some((u) => u.id === e.id);
                const inner = (
                  <>
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isNew ? "bg-primary" : "bg-transparent"}`} />
                    <span className="min-w-0">
                      <span className="block text-sm text-white break-words">{e.summary}</span>
                      <span className="block text-xs text-on-surface-variant">{timeAgo(e.created_at)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={e.id}>
                    {e.request_id ? (
                      <Link to={linkFor(e.request_id)} onClick={() => setIsOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-white/5">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex gap-3 px-4 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <Link to={overviewPath} onClick={() => setIsOpen(false)} className="block px-4 py-3 border-t border-white/10 text-xs font-bold text-primary hover:underline">
            See all activity &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
