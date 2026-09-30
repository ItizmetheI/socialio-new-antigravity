import { Link } from "react-router-dom";
import { formatDate } from "../../lib/format";
import type { Request } from "../../lib/database.types";
import { PLATFORM_COLORS, formatLabel, platformLabel } from "./requestMeta";
import { STAGE_STYLE } from "./stageStyle";

type Props = {
  request: Request;
  to: string;
  orgName?: string;
  assigneeName?: string;
  // Clients see "review" cards called out: that's the one stage waiting on them.
  highlightReview?: boolean;
};

const whenLabel = (request: Request) =>
  request.publish_at
    ? new Date(request.publish_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : request.due_date
      ? `Due ${formatDate(request.due_date)}`
      : null;

export default function RequestCard({ request, to, orgName, assigneeName, highlightReview }: Props) {
  const needsReview = highlightReview && request.stage === "review";
  const eyebrow = [orgName, formatLabel(request.format)].filter(Boolean).join(" · ");
  const when = whenLabel(request);
  const stage = STAGE_STYLE[request.stage];

  return (
    <Link
      to={to}
      className={`block rounded-xl border border-white/10 border-l-4 ${stage.border} bg-surface-container px-4 py-3.5 transition-colors hover:bg-white/[0.04]`}
    >
      {eyebrow && <div className="text-[11px] text-on-surface-variant mb-1 truncate">{eyebrow}</div>}
      <div className="text-sm font-bold text-white leading-snug">{request.title}</div>

      {(request.platforms.length > 0 || when || assigneeName) && (
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1.5 min-w-0">
            {request.platforms.map((p) => (
              <span key={p} title={platformLabel(p)} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PLATFORM_COLORS[p] }} />
            ))}
            <span className="truncate">{request.platforms.map(platformLabel).join(", ")}</span>
          </span>
          <span className="shrink-0">{[when, assigneeName].filter(Boolean).join(" · ")}</span>
        </div>
      )}

      {needsReview && <div className={`mt-3 text-[11px] font-bold ${stage.text}`}>Review this &rarr;</div>}
    </Link>
  );
}
