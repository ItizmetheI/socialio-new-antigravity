import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import ContentCalendar from "../components/workspace/ContentCalendar";
import PageHeader from "../components/workspace/PageHeader";
import type { Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

export default function CalendarPage() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [hasError, setHasError] = useState(false);

  const [liveTick, setLiveTick] = useState(0);
  useLiveRefresh(["requests"], () => setLiveTick((t) => t + 1), `org_id=eq.${orgId}`);
  useEffect(() => {
    let isMounted = true;
    supabase
      .from("requests")
      .select("*")
      .eq("org_id", orgId)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) setHasError(true);
        else setRequests((data ?? []) as Request[]);
      });
    return () => {
      isMounted = false;
    };
  }, [orgId, liveTick]);

  return (
    <div>
      <PageHeader title="Content calendar" description="What's going out, where, and when. Our team sets the publishing schedule." />
      {hasError ? (
        <ErrorBanner message="Couldn't load your calendar. Try refreshing." />
      ) : requests === null ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <ContentCalendar requests={requests} linkFor={(id) => `/app/requests/${id}`} />
      )}
    </div>
  );
}
