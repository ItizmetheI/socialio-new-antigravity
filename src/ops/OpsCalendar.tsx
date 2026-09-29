import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import ContentCalendar from "../components/workspace/ContentCalendar";
import PageHeader from "../components/workspace/PageHeader";
import type { Organization, Request } from "../lib/database.types";

// Every client's schedule on one calendar. Open a request to set its
// publish time, format and platforms.
export default function OpsCalendar() {
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState("");
  const [hasError, setHasError] = useState(false);

  const [liveTick, setLiveTick] = useState(0);
  useLiveRefresh(["requests"], () => setLiveTick((t) => t + 1));
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
  }, [liveTick]);

  const orgNameById = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Every client's publishing schedule. Open a piece to schedule it."
        action={
          <select
            aria-label="Client"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="field text-sm sm:w-auto"
          >
            <option value="">All clients</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        }
      />
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
