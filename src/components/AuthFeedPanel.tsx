import { PenTool, Video, TrendingUp, Search } from "lucide-react";
import Logo from "./Logo";

// Decorative only — deliberately no fake numbers or "live" framing (this
// site already had a fake LIVE_EVENTS ticker removed earlier for reading as
// AI-template slop; a marquee of fabricated stats here would be the same
// mistake). Reuses the reel color language from DeviceScrollShowcase
// (cream/coral/gradient blocks) as pure visual rhythm, not simulated data.
// Every bg color here is picked for contrast against the panel's own
// near-black background (#0c0712) — the first version used a near-black
// accent gradient that blended invisibly into the panel and read as a
// broken/empty layout.
const BLOCKS = [
  { icon: PenTool, label: "Social Media Posts", bg: "#EAE7E0", fg: "#1a1a1a" },
  { icon: Video, label: "Short-Form Videos", bg: "#ff6b4a", fg: "#ffffff" },
  { icon: TrendingUp, label: "Instagram Growth", bg: "#842bd2", fg: "#f0dbff" },
  { icon: Search, label: "SEO & Backlinks", bg: "#1c5f60", fg: "#ffffff" },
];

function ReelBlock({ icon: Icon, label, bg, fg }: (typeof BLOCKS)[number]) {
  return (
    <div
      className="w-full h-48 rounded-2xl flex flex-col items-center justify-center gap-3 shrink-0"
      style={{ background: bg, color: fg }}
    >
      <Icon className="w-8 h-8" strokeWidth={1.5} />
      <span className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
    </div>
  );
}

export default function AuthFeedPanel() {
  return (
    <div className="hidden lg:flex w-[42%] relative bg-[#0c0712] border-r border-white/5 flex-col p-12 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10">
        <Logo />
      </div>

      <div className="relative z-10 flex-1 flex items-center my-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
        <div className="w-full max-w-[300px] mx-auto h-[560px] overflow-hidden">
          <div className="flex flex-col gap-4 animate-slide-up" style={{ animationDuration: "20s" }}>
            {[...BLOCKS, ...BLOCKS].map((block, i) => (
              <ReelBlock key={i} {...block} />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <p className="hero-display text-2xl font-bold text-white leading-tight mb-2">
          The feed people <span className="italic text-primary">can&apos;t skip.</span>
        </p>
        <p className="text-sm text-on-surface-variant">Everything your team ships, in one place.</p>
      </div>
    </div>
  );
}
