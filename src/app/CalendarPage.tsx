import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import ContentCalendar from "../components/workspace/ContentCalendar";
import type { Request } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

export default function CalendarPage() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [hasError, setHasError] = useState(false);

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
  }, [orgId]);

  return (
    <div className="p-5 md:p-10">
      <h1 className="hero-display font-bold text-3xl text-white mb-1">Content calendar</h1>
      <p className="text-on-surface-variant text-sm mb-8">What&apos;s going out, where, and when. Our team sets the publishing schedule.</p>
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
