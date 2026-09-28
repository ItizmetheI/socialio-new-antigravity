import { SHOWCASE_MP4S } from "../data/showcaseVideos";

// The work, not the software: real showcase clips (UGC, reels) playing muted
// in two offset columns beside the sign-in form. Only rendered on wide
// screens (see AuthLayout), so phones don't download four videos.
const CLIPS = Object.values(SHOWCASE_MP4S);
const LABELS = ["UGC video", "Short-form reel", "Founder-led UGC", "Product reel"];

function Clip({ src, label }: { src: string; label: string }) {
  return (
    <figure className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface-container border border-white/10">
      <video src={src} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
      <figcaption className="absolute left-3 bottom-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/60 text-[#fff] backdrop-blur-sm">
        {label}
      </figcaption>
    </figure>
  );
}

export default function AuthWorkShowcase() {
  const left = CLIPS.filter((_, i) => i % 2 === 0);
  const right = CLIPS.filter((_, i) => i % 2 === 1);

  return (
    <div className="h-full rounded-3xl bg-surface-container border border-white/10 p-8 xl:p-10 flex flex-col gap-8 overflow-hidden">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Made by Socialio</p>
        <p className="hero-display text-2xl xl:text-3xl font-bold text-white leading-tight max-w-md">
          Content made to stop the scroll.
        </p>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]">
        <div className="flex flex-col gap-4">
          {left.map((src, i) => (
            <Clip key={src} src={src} label={LABELS[i * 2] ?? "Reel"} />
          ))}
        </div>
        <div className="flex flex-col gap-4 pt-16">
          {right.map((src, i) => (
            <Clip key={src} src={src} label={LABELS[i * 2 + 1] ?? "Reel"} />
          ))}
        </div>
      </div>
    </div>
  );
}
