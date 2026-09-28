import { formatCents, formatDate } from "../../lib/format";
import type { LedgerLine } from "./LedgerData";

const pct = (part: number, whole: number) => `${Math.min(100, (part / whole) * 100)}%`;

// One row per purchased line: price, this period's usage, and what's left.
export default function LedgerLines({ lines }: { lines: LedgerLine[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {lines.map((line) => {
        const isMonthly = line.item.billing_interval === "month";
        return (
          <li key={line.item.id} className="bg-surface-container border border-white/10 rounded-2xl p-5 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <div className="font-bold text-white truncate">{line.title}</div>
                <div className="text-xs text-on-surface-variant truncate">
                  {isMonthly ? `${line.item.tier_label} · resets ${formatDate(line.periodEnd?.toISOString())}` : "One-time purchase"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-white">
                  {formatCents(line.priceCents, line.currency)}
                  {isMonthly && <span className="text-on-surface-variant font-normal text-xs">/mo</span>}
                </div>
                <div className="text-xs text-on-surface-variant">{formatCents(line.valueRemainingCents, line.currency)} left</div>
              </div>
            </div>

            <div className="flex h-1.5 rounded-full bg-white/10 overflow-hidden mb-2.5" aria-hidden="true">
              <div className="bg-primary" style={{ width: pct(line.delivered, line.units) }} />
              <div className="bg-primary/45" style={{ width: pct(line.inProgress, line.units) }} />
              <div className="bg-white/30" style={{ width: pct(line.requested, line.units) }} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <span>
                {isMonthly ? "This period: " : ""}
                <span className="text-white font-bold">{line.delivered}</span> delivered · {line.inProgress} in progress · {line.requested} queued
              </span>
              <span className={line.over ? "text-primary font-bold" : ""}>
                {line.over ? `${line.over} over` : `${line.remaining} of ${line.units} left`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
