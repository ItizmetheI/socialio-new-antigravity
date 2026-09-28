import { Link } from "react-router-dom";
import { CalendarClock, Clock } from "lucide-react";
import { formatDate } from "../../lib/format";
import type { Request } from "../../lib/database.types";
import { PLATFORM_COLORS, formatLabel, platformLabel } from "./requestMeta";

type Props = {
  request: Request;
  to: string;
  orgName?: string;
  assigneeName?: string;
  // Clients see "review" cards called out: that's the one stage waiting on them.
  highlightReview?: boolean;
};

export default function RequestCard({ request, to, orgName, assigneeName, highlightReview }: Props) {
  const format = formatLabel(request.format);
  const needsReview = highlightReview && request.stage === "review";

  return (
    <Link
      to={to}
      className={`block bg-surface-container border rounded-2xl p-4 transition-colors hover:border-primary/40 ${
        needsReview ? "border-primary/50 ring-1 ring-primary/20" : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {format ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{format}</span>
        ) : (
          <span />
        )}
        {needsReview && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary text-[#fff]">Review now</span>
        )}
      </div>
      {orgName && <div className="text-xs font-bold text-on-surface-variant mb-1 truncate">{orgName}</div>}
      <div className="font-bold text-white text-sm leading-snug mb-3">{request.title}</div>

      {request.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {request.platforms.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />
              {platformLabel(p)}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        {request.publish_at ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            {new Date(request.publish_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        ) : request.due_date ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Due {formatDate(request.due_date)}
          </span>
        ) : (
          <span />
        )}
        {assigneeName && <span className="truncate max-w-[8rem]">{assigneeName}</span>}
      </div>
    </Link>
  );
}
