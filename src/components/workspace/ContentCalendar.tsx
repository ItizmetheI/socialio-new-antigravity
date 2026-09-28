import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PLATFORMS } from "../../lib/database.types";
import type { Platform, Request } from "../../lib/database.types";
import { localDateString } from "../../lib/format";
import { PLATFORM_COLORS, calendarDay, platformLabel } from "./requestMeta";

type Props = {
  requests: Request[];
  linkFor: (id: string) => string;
  orgNameById?: Map<string, string>;
};

type Entry = { request: Request; day: string; kind: "publish" | "due" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const UPCOMING_LIMIT = 8;

const timeOf = (entry: Entry) =>
  entry.kind === "publish" && entry.request.publish_at
    ? new Date(entry.request.publish_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "Due";

// Scheduled items sort by publish time; unscheduled ones go last in their day.
const sortTime = (entry: Entry) =>
  entry.kind === "publish" && entry.request.publish_at
    ? new Date(entry.request.publish_at).getTime()
    : new Date(`${entry.day}T23:59:59`).getTime();

// Monday-first grid of the month, padded with null cells before day 1.
function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(localDateString(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function EntryChip({ entry, to, orgName }: { entry: Entry; to: string; orgName?: string }) {
  const { request } = entry;
  return (
    <Link
      to={to}
      title={request.title}
      className={`block rounded-lg px-2 py-1.5 text-[11px] leading-tight transition-colors hover:bg-white/10 ${
        entry.kind === "publish" ? "bg-white/5" : "border border-dashed border-white/15"
      }`}
    >
      <span className="flex items-center gap-1 mb-0.5">
        {request.platforms.map((p) => (
          <span key={p} className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />
        ))}
        <span className="text-on-surface-variant">{timeOf(entry)}</span>
      </span>
      <span className="block text-white font-bold truncate">{request.title}</span>
      {orgName && <span className="block text-on-surface-variant truncate">{orgName}</span>}
    </Link>
  );
}

export default function ContentCalendar({ requests, linkFor, orgNameById }: Props) {
  const today = localDateString();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [platform, setPlatform] = useState<Platform | "">("");

  const entries = useMemo(() => {
    const list: Entry[] = [];
    requests.forEach((request) => {
      const placed = calendarDay(request);
      if (placed && (!platform || request.platforms.includes(platform))) list.push({ request, ...placed });
    });
    return list.sort((a, b) => sortTime(a) - sortTime(b));
  }, [requests, platform]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((e) => map.set(e.day, [...(map.get(e.day) ?? []), e]));
    return map;
  }, [entries]);

  const cells = monthCells(cursor.year, cursor.month);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((e) => e.day.startsWith(monthPrefix));
  const upcoming = entries.filter((e) => e.day >= today && e.request.stage !== "delivered").slice(0, UPCOMING_LIMIT);
  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_16rem] gap-10">
      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1">
            <button onClick={() => shift(-1)} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-white/5 text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-white min-w-[9.5rem] text-center">{monthName}</h2>
            <button onClick={() => shift(1)} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-white/5 text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <select
            aria-label="Platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform | "")}
            className="bg-background border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Month grid from md up */}
        <div className="hidden md:grid grid-cols-7 border-t border-l border-white/10">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-r border-b border-white/10 px-2 py-2 text-xs text-on-surface-variant">
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div key={day ?? `pad-${i}`} className={`border-r border-b border-white/10 min-h-[6.5rem] p-1.5 ${day ? "" : "bg-white/[0.02]"}`}>
              {day && (
                <>
                  <div
                    className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      day === today ? "bg-primary text-[#fff]" : "text-on-surface-variant"
                    }`}
                  >
                    {Number(day.slice(8))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {(byDay.get(day) ?? []).map((entry) => (
                      <EntryChip key={entry.request.id} entry={entry} to={linkFor(entry.request.id)} orgName={orgNameById?.get(entry.request.org_id)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Agenda on phones */}
        <div className="md:hidden flex flex-col gap-2">
          {monthEntries.length === 0 && <p className="text-sm text-on-surface-variant py-6 text-center">Nothing scheduled this month.</p>}
          {monthEntries.map((entry) => (
            <div key={entry.request.id} className="flex gap-3 items-start">
              <div className="w-12 shrink-0 text-center">
                <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {new Date(`${entry.day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className={`text-lg font-bold ${entry.day === today ? "text-primary" : "text-white"}`}>{Number(entry.day.slice(8))}</div>
              </div>
              <div className="flex-1 min-w-0">
                <EntryChip entry={entry} to={linkFor(entry.request.id)} orgName={orgNameById?.get(entry.request.org_id)} />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-on-surface-variant mt-3">
          Solid = scheduled to publish. Dashed = due date, not scheduled yet.
        </p>
      </section>

      <aside>
        <h2 className="font-bold text-white pb-2 mb-1 border-b border-white/10">Up next</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-3">Nothing coming up.</p>
        ) : (
          <ol className="divide-y divide-white/10">
            {upcoming.map((entry) => (
              <li key={entry.request.id}>
                <Link to={linkFor(entry.request.id)} className="block group py-3">
                  <div className="text-xs text-on-surface-variant mb-0.5">
                    {new Date(`${entry.day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {timeOf(entry)}
                  </div>
                  <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{entry.request.title}</div>
                  {entry.request.platforms.length > 0 && (
                    <div className="text-xs text-on-surface-variant">{entry.request.platforms.map(platformLabel).join(" · ")}</div>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
