import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ResultsView from "../components/workspace/ResultsView";
import PageHeader from "../components/workspace/PageHeader";
import type { PerformanceReport } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

export default function ResultsPage() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [reports, setReports] = useState<PerformanceReport[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("performance_reports")
      .select("*")
      .eq("org_id", orgId)
      .order("period_month", { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) setHasError(true);
        else setReports((data ?? []) as PerformanceReport[]);
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  return (
    <div>
      <PageHeader title="Results" description="Real numbers from your accounts, reported by our team each month." />
      {hasError ? (
        <ErrorBanner message="Couldn't load your results. Try refreshing." />
      ) : reports === null ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState title="No report yet" description="Your first monthly report shows up here after your first full month with us." />
      ) : (
        <ResultsView reports={reports} />
      )}
    </div>
  );
}
