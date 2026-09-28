import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PerformanceReport, Platform } from "../../lib/database.types";
import { PLATFORM_COLORS, platformLabel } from "./requestMeta";
import StatStrip from "./StatStrip";

const monthLabel = (period: string) =>
  new Date(`${period}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" });

const sum = (rows: PerformanceReport[], key: "followers" | "reach" | "posts_published") =>
  rows.reduce((total, r) => total + (r[key] ?? 0), 0);

// Average of the platforms that reported a rate, not a blend weighted by
// reach — simple and honest about what was measured.
const avgEngagement = (rows: PerformanceReport[]) => {
  const rated = rows.filter((r) => r.engagement_rate != null);
  return rated.length ? rated.reduce((t, r) => t + Number(r.engagement_rate), 0) / rated.length : null;
};

// Counts compare as % change; a rate (engagement) compares in points, since
// "+6% engagement" would read as six points when it's really 0.35.
function Delta({ current, previous, isRate = false }: { current: number | null; previous: number | null; isRate?: boolean }) {
  if (current == null || previous == null || (!isRate && previous === 0)) return null;
  const change = isRate ? current - previous : ((current - previous) / previous) * 100;
  const isUp = change >= 0;
  return (
    <span className={`text-xs font-bold ${isUp ? "text-emerald-500" : "text-red-400"}`}>
      {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}
      {isRate ? " pts" : "%"} vs last month
    </span>
  );
}

export default function ResultsView({ reports }: { reports: PerformanceReport[] }) {
  const months = [...new Set(reports.map((r) => r.period_month))].sort();
  const platforms = [...new Set(reports.map((r) => r.platform))] as Platform[];
  const latest = months.at(-1);
  const previous = months.at(-2);
  const latestRows = reports.filter((r) => r.period_month === latest);
  const previousRows = previous ? reports.filter((r) => r.period_month === previous) : [];

  const chartData = months.map((m) => {
    const point: Record<string, string | number> = { month: monthLabel(m) };
    reports.filter((r) => r.period_month === m).forEach((r) => {
      if (r.followers != null) point[r.platform] = r.followers;
    });
    return point;
  });

  // Month-on-month changes only compare platforms reported in both months,
  // so adding a new channel doesn't show up as fake growth.
  const shared = new Set(latestRows.map((r) => r.platform).filter((p) => previousRows.some((r) => r.platform === p)));
  const latestShared = latestRows.filter((r) => shared.has(r.platform));
  const previousShared = previousRows.filter((r) => shared.has(r.platform));
  const deltaFor = (key: "followers" | "reach" | "posts_published") =>
    shared.size ? <Delta current={sum(latestShared, key)} previous={sum(previousShared, key)} /> : null;
  const latestEng = avgEngagement(latestRows);
  const tiles = [
    { label: "Total followers", value: sum(latestRows, "followers").toLocaleString(), delta: deltaFor("followers") },
    { label: "Reach", value: sum(latestRows, "reach").toLocaleString(), delta: deltaFor("reach") },
    {
      label: "Avg engagement",
      value: latestEng != null ? `${latestEng.toFixed(1)}%` : "—",
      delta: shared.size ? <Delta current={avgEngagement(latestShared)} previous={avgEngagement(previousShared)} isRate /> : null,
    },
    { label: "Posts published", value: sum(latestRows, "posts_published").toLocaleString(), delta: deltaFor("posts_published") },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-xs text-on-surface-variant mb-2">
          Latest report: <span className="text-white font-bold">{latest ? new Date(`${latest}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—"}</span>
        </div>
        <StatStrip stats={tiles.map((t) => ({ label: t.label, value: t.value, detail: t.delta }))} />
      </div>

      {months.length > 1 && (
        <section className="mb-10">
          <h2 className="font-bold text-white mb-1">Followers by platform</h2>
          <p className="text-xs text-on-surface-variant mb-4">End-of-month follower count on each channel we manage.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 11 }} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v: number, name: string) => [v.toLocaleString(), platformLabel(name as Platform)]} />
                <Legend formatter={(name: string) => platformLabel(name as Platform)} wrapperStyle={{ fontSize: 12 }} />
                {platforms.map((p) => (
                  <Line key={p} type="monotone" dataKey={p} stroke={PLATFORM_COLORS[p]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="overflow-x-auto">
        <h2 className="font-bold text-white mb-3">Monthly breakdown</h2>
        <table className="w-full text-sm min-w-[36rem]">
          <thead>
            <tr className="text-left text-xs text-on-surface-variant border-b border-white/10">
              <th className="pb-3 font-bold">Month</th>
              <th className="pb-3 font-bold">Platform</th>
              <th className="pb-3 font-bold text-right">Followers</th>
              <th className="pb-3 font-bold text-right">Reach</th>
              <th className="pb-3 font-bold text-right">Engagement</th>
              <th className="pb-3 font-bold text-right">Posts</th>
            </tr>
          </thead>
          <tbody>
            {[...reports]
              .sort((a, b) => b.period_month.localeCompare(a.period_month) || a.platform.localeCompare(b.platform))
              .map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2.5 text-white">{monthLabel(r.period_month)}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-white">
                      <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[r.platform] }} />
                      {platformLabel(r.platform)}
                    </span>
                    {r.notes && <div className="text-xs text-on-surface-variant mt-0.5">{r.notes}</div>}
                  </td>
                  <td className="py-2.5 text-right text-white">{r.followers?.toLocaleString() ?? "—"}</td>
                  <td className="py-2.5 text-right text-white">{r.reach?.toLocaleString() ?? "—"}</td>
                  <td className="py-2.5 text-right text-white">{r.engagement_rate != null ? `${Number(r.engagement_rate).toFixed(1)}%` : "—"}</td>
                  <td className="py-2.5 text-right text-white">{r.posts_published ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
