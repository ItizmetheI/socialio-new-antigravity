import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import ContentCalendar from "../components/workspace/ContentCalendar";
import type { Organization, Request } from "../lib/database.types";

// Every client's schedule on one calendar. Open a request to set its
// publish time, format and platforms.
export default function OpsCalendar() {
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([supabase.from("requests").select("*"), supabase.from("organizations").select("*").order("name")]).then(
      ([requestsRes, orgsRes]) => {
        if (!isMounted) return;
        if (requestsRes.error || orgsRes.error) {
          setHasError(true);
          return;
        }
        setRequests((requestsRes.data ?? []) as Request[]);
        setOrgs((orgsRes.data ?? []) as Organization[]);
      },
    );
    return () => {
      isMounted = false;
    };
  }, []);

  const orgNameById = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  return (
    <div className="p-5 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="hero-display font-bold text-3xl text-white mb-1">Calendar</h1>
          <p className="text-on-surface-variant text-sm">All clients&apos; publishing schedule. Open a piece to schedule it.</p>
        </div>
        <select
          aria-label="Client"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
        >
          <option value="">All clients</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      {hasError ? (
        <ErrorBanner message="Couldn't load the calendar. Try refreshing." />
      ) : requests === null ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <ContentCalendar
          requests={orgId ? requests.filter((r) => r.org_id === orgId) : requests}
          linkFor={(id) => `/ops/requests/${id}`}
          orgNameById={orgId ? undefined : orgNameById}
        />
      )}
    </div>
  );
}
