import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PageHeader from "../components/workspace/PageHeader";
import StatStrip from "../components/workspace/StatStrip";
import RequestCard from "../components/workspace/RequestCard";
import LedgerLines from "../components/workspace/LedgerLines";
import { computeLedger, loadLedgerData, type LedgerData } from "../components/workspace/LedgerData";
import { formatCents, formatDate } from "../lib/format";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

const BRIEFS_SHOWN = 5;

// "What you bought, what's used, what's left" — the client's order ledger.
export default function AccountPage() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<LedgerData | null>(null);

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    loadLedgerData(orgId).then((result) => {
      if (!isMounted) return;
      setData(result);
      setState(result ? "ready" : "error");
    });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div>
        <ErrorBanner message="Couldn't load your account. Try refreshing." />
      </div>
    );
  }

  const lines = computeLedger(data);
  const currency = lines[0]?.currency ?? "usd";
  const totalPaid = data.payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);
  const valueLeft = lines.reduce((sum, l) => sum + l.valueRemainingCents, 0);
  const delivered = lines.reduce((sum, l) => sum + l.delivered, 0);
  const inProgress = lines.reduce((sum, l) => sum + l.inProgress, 0);
  const briefs = data.requests.filter((r) => r.description).slice(0, BRIEFS_SHOWN);
  const active = data.requests.filter((r) => r.stage === "in_progress" || r.stage === "review");

  return (
    <div className="min-w-0">
      <PageHeader title="Account" description="What you bought, what we've delivered this period, and what's left to use." />

      <StatStrip
        stats={[
          { label: "Total paid", value: formatCents(totalPaid, currency) },
          { label: "Value remaining", value: formatCents(valueLeft, currency), isAccent: valueLeft > 0 },
          { label: "Delivered this period", value: delivered },
          { label: "In progress", value: inProgress },
        ]}
      />

      <section className="mb-12">
        <h2 className="font-bold text-white mb-4">What you bought</h2>
        {lines.length === 0 ? (
          <EmptyState title="No orders yet" description="Once you check out, each service you bought shows here with what's been used and what's left." />
        ) : (
          <LedgerLines lines={lines} />
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-x-10 gap-y-12">
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-bold text-white">What you told us</h2>
            <Link to="/app/requests" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0">
              Pipeline <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {briefs.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No briefs yet. Send a request from the pipeline.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {briefs.map((r) => (
                <li key={r.id} className="min-w-0">
                  <Link to={`/app/requests/${r.id}`} className="block py-3 -mx-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-bold text-white text-sm truncate">{r.title}</span>
                      <span className="text-xs text-on-surface-variant shrink-0">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mt-0.5 break-words">{r.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          <h2 className="font-bold text-white mb-4">What we're working on</h2>
          {active.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Nothing in production right now.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {active.map((r) => (
                <RequestCard key={r.id} request={r} to={`/app/requests/${r.id}`} highlightReview />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
