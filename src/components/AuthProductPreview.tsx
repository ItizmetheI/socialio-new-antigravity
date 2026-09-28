import { CalendarDays, KanbanSquare, TrendingUp } from "lucide-react";

// What people are signing into: a still of the real dashboard's pieces
// (pipeline cards, the calendar week, a results number), drawn with the same
// tokens so it matches light and dark mode. Sample content, not claims.
const CARDS = [
  { eyebrow: "Carousel", title: "Launch week: 5 tips carousel", meta: "Instagram, LinkedIn", stage: "In production" },
  { eyebrow: "Reel", title: "Behind the scenes: packing day", meta: "TikTok, Instagram", stage: "Ready for your review", isReview: true },
  { eyebrow: "Single graphic", title: "Customer quote of the week", meta: "LinkedIn", stage: "Scheduled · Fri 10:00" },
];

const WEEK = [
  { day: "Mon", dots: [] as string[] },
  { day: "Tue", dots: ["#d6249f"] },
  { day: "Wed", dots: [] },
  { day: "Thu", dots: ["#25f4ee", "#d6249f"] },
  { day: "Fri", dots: ["#0a66c2"] },
  { day: "Sat", dots: [] },
  { day: "Sun", dots: ["#d6249f"] },
];

export default function AuthProductPreview() {
  return (
    <div className="h-full rounded-3xl border border-white/10 bg-surface-container p-8 xl:p-10 flex flex-col justify-center gap-6 overflow-hidden">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Your dashboard</p>
        <p className="hero-display text-2xl xl:text-3xl font-bold text-white leading-tight max-w-md">
          Every post, reel and result in one place.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-background p-4">
        <h3 className="flex items-center gap-2 text-xs font-bold text-on-surface-variant mb-3">
          <KanbanSquare className="w-4 h-4" /> Pipeline
        </h3>
        <ul className="flex flex-col gap-2">
          {CARDS.map((c) => (
            <li
              key={c.title}
              className={`rounded-xl border px-3.5 py-3 bg-surface-container ${c.isReview ? "border-primary/60" : "border-white/10"}`}
            >
              <div className="text-[11px] text-on-surface-variant">{c.eyebrow}</div>
              <div className="text-sm font-bold text-white">{c.title}</div>
              <div className="mt-1 flex justify-between gap-3 text-[11px] text-on-surface-variant">
                <span>{c.meta}</span>
                <span className={c.isReview ? "text-primary font-bold" : ""}>{c.stage}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
        <section className="rounded-2xl border border-white/10 bg-background p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold text-on-surface-variant mb-3">
            <CalendarDays className="w-4 h-4" /> This week
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK.map((d) => (
              <div key={d.day}>
                <div className="text-[10px] text-on-surface-variant mb-1.5">{d.day}</div>
                <div className="h-8 rounded-lg bg-surface-container flex items-center justify-center gap-0.5">
                  {d.dots.map((c, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-background p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold text-on-surface-variant mb-2">
            <TrendingUp className="w-4 h-4" /> Results
          </h3>
          <svg viewBox="0 0 120 40" className="w-full h-10 text-primary" aria-hidden="true">
            <polyline points="0,34 20,30 40,31 60,22 80,18 100,10 120,6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-[11px] text-on-surface-variant mt-1">Followers, reach and engagement, reported monthly.</div>
        </section>
      </div>
    </div>
  );
}
