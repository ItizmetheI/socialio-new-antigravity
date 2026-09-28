import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { TEST_MODE } from "./testMode/flag";

export type LiveTable = "activity_events" | "requests" | "comments" | "deliverables";

// Re-runs `onChange` whenever a row in one of `tables` changes, so a page
// stays current without a refresh (staff move a card → the client's
// pipeline moves too). Realtime applies RLS, so a subscriber only hears
// about rows they're allowed to read. Bursts are coalesced into one reload.
// `filter` is a Realtime filter such as `org_id=eq.<uuid>` (optional).
export function useLiveRefresh(tables: LiveTable[], onChange: () => void, filter?: string) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const key = tables.join(",");

  useEffect(() => {
    if (TEST_MODE) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), 400);
    };
    const channel = supabase.channel(`live:${key}:${filter ?? "all"}:${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, fire);
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [key, filter]);
}
