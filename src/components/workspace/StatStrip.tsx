import type { ReactNode } from "react";

export type Stat = { label: string; value: ReactNode; detail?: ReactNode; isAccent?: boolean };

// Headline numbers as one quiet strip split by hairlines (1px grid gaps over
// a line-coloured background), instead of a row of separate boxed tiles.
export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border-y border-white/10 mb-10">
      {stats.map((s) => (
        <div key={s.label} className="bg-background py-5 px-4 odd:pl-0 lg:odd:pl-4 lg:first:pl-0">
          <dt className="text-xs text-on-surface-variant mb-1">{s.label}</dt>
          <dd className={`text-2xl md:text-3xl font-bold ${s.isAccent ? "text-primary" : "text-white"}`}>{s.value}</dd>
          {s.detail && <dd className="mt-1 text-xs">{s.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}
