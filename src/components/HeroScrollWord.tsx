import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useLenis } from "lenis/react";
import { ArrowRight } from "lucide-react";
import Magnetic from "./Magnetic";
import { useScrollRange } from "../lib/useScrollRange";
import { SHOWCASE_MP4S } from "../data/showcaseVideos";

const WORD = "SCROLL";
const FONT_FAMILY = '"Bricolage Grotesque", sans-serif';
const FONT_WEIGHT = 800;
// The logo's own two colors (sampled from public/logo.png). Shared with
// DeviceScrollShowcase's opening overlay — the dive ends on this exact
// full-screen gradient, and the phone section starts on it.
export const HERO_GRADIENT_STOPS = ["#1b75bc", "#652c91"] as const;
// The dive completes at this point of the hero's scroll track; the rest is a
// short hold before the gradient dissolves into the phone section.
const ZOOM_END = 0.85;
// Letter shape is rasterized once at this multiple of display size.
const MASK_RESOLUTION = 2;

const CARDS = Object.values(SHOWCASE_MP4S).map((src, i) => ({
  src,
  className: [
    "left-[-14px] bottom-[5%] w-[88px] -rotate-6 md:left-[4%] md:top-[16%] md:bottom-auto md:w-[150px]",
    "hidden md:block left-[9%] top-[58%] w-[125px] rotate-3",
    "right-[-14px] bottom-[7%] w-[92px] rotate-6 md:right-[5%] md:top-[12%] md:bottom-auto md:w-[165px]",
    "hidden md:block right-[10%] top-[56%] w-[135px] -rotate-3",
  ][i],
}));

type Layout = {
  dpr: number;
  width: number;
  height: number;
  slot: { x: number; y: number; w: number; h: number };
  mask: HTMLCanvasElement;
  fill: CanvasGradient;
  origin: { x: number; y: number };
  maxScale: number;
};

// Finds the stroke to dive into: the run through the middle row of the
// letters with the largest width × height (a letter stem, not the thin S
// spine), and the scale at which that stroke covers the whole viewport.
function findDiveTarget(
  mctx: CanvasRenderingContext2D,
  maskW: number,
  maskH: number,
  pxPerCss: number,
  slot: Layout["slot"],
  width: number,
  height: number,
) {
  const data = mctx.getImageData(0, 0, maskW, maskH).data;
  const filled = (x: number, y: number) => data[(y * maskW + x) * 4 + 3] > 128;
  const midY = Math.round(maskH / 2);
  let best = { score: 0, x1: 0, x2: 0, y1: 0, y2: 0 };
  for (let x = 0; x < maskW; x++) {
    if (!filled(x, midY)) continue;
    let x2 = x;
    while (x2 < maskW - 1 && filled(x2 + 1, midY)) x2++;
    const cx = (x + x2) >> 1;
    let y1 = midY;
    while (y1 > 0 && filled(cx, y1 - 1)) y1--;
    let y2 = midY;
    while (y2 < maskH - 1 && filled(cx, y2 + 1)) y2++;
    const score = (x2 - x + 1) * (y2 - y1 + 1);
    if (score > best.score) best = { score, x1: x, x2, y1, y2 };
    x = x2;
  }
  const mx = (best.x1 + best.x2) / 2;
  const my = (best.y1 + best.y2) / 2;
  const origin = { x: slot.x + mx / pxPerCss, y: slot.y + my / pxPerCss };
  const half = {
    w: Math.max(1, (best.x2 - best.x1) / 2 / pxPerCss),
    h: Math.max(1, (best.y2 - best.y1) / 2 / pxPerCss),
  };
  const maxScale =
    1.12 *
    Math.max(origin.x / half.w, (width - origin.x) / half.w, origin.y / half.h, (height - origin.y) / half.h);
  return { origin, maxScale };
}

// The word lives in a canvas: a full-width gradient, clipped to the letter
// shape with destination-in. Per frame that's one fill and one scaled
// drawImage of a pre-rendered mask — no glyph re-rasterizing, no filters.
function useWordCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  slotRef: React.RefObject<HTMLDivElement | null>,
  progress: MotionValue<number>,
  animate: boolean,
  onRatio: (ratio: number) => void,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const slotEl = slotRef.current;
    if (!canvas || !slotEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let layout: Layout | null = null;
    let raf = 0;
    let visible = true;
    let fontReady = false;
    let cancelled = false;

    const measure = () => {
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.font = `${FONT_WEIGHT} 100px ${FONT_FAMILY}`;
      const m = probe.measureText(WORD);
      return {
        m,
        w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
        h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
      };
    };

    const buildLayout = () => {
      if (!fontReady) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const c = canvas.getBoundingClientRect();
      const s = slotEl.getBoundingClientRect();
      const slot = { x: s.left - c.left, y: s.top - c.top, w: s.width, h: s.height };

      const { m, w } = measure();
      const k = slot.w / w;
      const pxPerCss = dpr * MASK_RESOLUTION;
      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(slot.w * pxPerCss));
      mask.height = Math.max(1, Math.round(slot.h * pxPerCss));
      const mctx = mask.getContext("2d", { willReadFrequently: true })!;
      mctx.scale(pxPerCss, pxPerCss);
      mctx.font = `${FONT_WEIGHT} ${100 * k}px ${FONT_FAMILY}`;
      mctx.fillStyle = "#000";
      mctx.fillText(WORD, m.actualBoundingBoxLeft * k, m.actualBoundingBoxAscent * k);

      const fill = ctx.createLinearGradient(0, 0, width, 0);
      fill.addColorStop(0, HERO_GRADIENT_STOPS[0]);
      fill.addColorStop(1, HERO_GRADIENT_STOPS[1]);

      const { origin, maxScale } = findDiveTarget(mctx, mask.width, mask.height, pxPerCss, slot, width, height);
      layout = { dpr, width, height, slot, mask, fill, origin, maxScale };
    };

    const draw = () => {
      if (!layout) return;
      const { dpr, width, height, slot, mask, fill, origin, maxScale } = layout;
      const p = animate ? progress.get() : 0;
      const t = Math.min(Math.max(p / ZOOM_END, 0), 1);
      // Exponential zoom reads as constant camera speed; the extra ease-in
      // keeps the first stretch of scrolling gentle.
      const scale = Math.pow(maxScale, Math.pow(t, 1.3));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "destination-in";
      ctx.translate(origin.x, origin.y);
      ctx.scale(scale, scale);
      ctx.translate(-origin.x, -origin.y);
      ctx.drawImage(mask, slot.x, slot.y, slot.w, slot.h);
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      draw();
      raf = visible && animate ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (animate) {
        if (!raf) raf = requestAnimationFrame(loop);
      } else draw();
    };

    document.fonts.load(`${FONT_WEIGHT} 100px ${FONT_FAMILY}`).then(() => {
      if (cancelled) return;
      fontReady = true;
      const { w, h } = measure();
      onRatio(w / h);
      buildLayout();
      start();
    });

    const resize = new ResizeObserver(() => {
      buildLayout();
      draw();
    });
    resize.observe(slotEl);
    resize.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
    };
  }, [canvasRef, slotRef, progress, animate, onRatio]);
}

export default function HeroScrollWord() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(3.6);
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;
  const lenis = useLenis();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // Same scroll range as DeviceScrollShowcase's entry, so the two gradients
  // dissolve in lockstep and the handoff has no seam.
  const { scrollYProgress: exitProgress } = useScroll({ target: sectionRef, offset: ["end end", "end start"] });

  const chromeOpacity = useScrollRange(scrollYProgress, [0, 0.12], [1, 0]);
  const chromeY = useTransform(scrollYProgress, [0, 0.12], [0, -24]);
  const chromePointer = useTransform(scrollYProgress, (v) => (v > 0.1 ? "none" : "auto"));
  // The clip cards sit "closer to the camera": scaling their container about
  // the viewport center flies them outward past the viewer.
  const cardsScale = useTransform(scrollYProgress, (v) => Math.pow(5, Math.min(v / 0.5, 1)));
  const cardsOpacity = useScrollRange(scrollYProgress, [0.3, 0.5], [1, 0]);
  const wordExitOpacity = useScrollRange(exitProgress, [0, 0.6], [1, 0]);

  useWordCanvas(canvasRef, slotRef, scrollYProgress, animate, setRatio);

  // Pause the clips whenever the hero is off-screen.
  useEffect(() => {
    const root = cardsRef.current;
    if (!root) return;
    const videos = [...root.querySelectorAll("video")];
    const io = new IntersectionObserver(([entry]) => {
      videos.forEach((v) => (entry.isIntersecting && animate ? v.play().catch(() => {}) : v.pause()));
    });
    io.observe(root);
    return () => io.disconnect();
  }, [animate]);

  const scrollToProcess = () => {
    const target = document.getElementById("how-it-works");
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} className={`relative bg-background ${animate ? "h-[220vh]" : "h-screen"}`}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          ref={cardsRef}
          style={animate ? { scale: cardsScale, opacity: cardsOpacity } : undefined}
          className="absolute inset-0 z-0 origin-center will-change-transform"
          aria-hidden="true"
        >
          {CARDS.map((card) => (
            <div
              key={card.src}
              className={`absolute aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-surface-container shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)] ${card.className}`}
            >
              <video src={card.src} muted loop playsInline autoPlay={animate} preload="auto" className="w-full h-full object-cover" />
            </div>
          ))}
        </motion.div>

        <motion.canvas
          ref={canvasRef}
          style={animate ? { opacity: wordExitOpacity } : undefined}
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Sizes key off viewport height as well as width so the whole block
            fits under the fixed nav on short screens (docked laptop windows,
            landscape phones) instead of sliding up behind it. */}
        <div className="relative z-20 h-full max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center pt-24 pb-6">
          <motion.h1
            style={{ opacity: chromeOpacity, y: chromeY }}
            className="hero-display font-bold text-white tracking-tight leading-tight text-[clamp(1.5rem,min(6vw,6.5vh),3rem)] text-balance"
          >
            Content made to stop the <span className="sr-only">scroll.</span>
          </motion.h1>

          <div
            ref={slotRef}
            className="my-[2.5vh]"
            style={{ aspectRatio: ratio, width: `min(100%, calc(${ratio} * 24vh))` }}
          />

          <motion.div
            style={{ opacity: chromeOpacity, y: chromeY, pointerEvents: chromePointer }}
            className="flex flex-col items-center gap-[min(1.5rem,3vh)]"
          >
            <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-xl [@media(max-height:560px)]:hidden">
              Posts, short-form video, UGC and SEO articles — made for your brand every month, for one flat price.
            </p>
            <div className="flex flex-row flex-wrap justify-center items-center gap-3">
              <Magnetic>
                <Link
                  to="/pricing"
                  className="bg-white text-background px-7 py-4 rounded-lg font-bold text-sm hover:bg-primary hover:text-[#fff] transition-colors duration-300 flex items-center gap-2 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  See plans & pricing
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Magnetic>
              <button
                type="button"
                onClick={scrollToProcess}
                className="px-7 py-4 rounded-lg font-bold text-sm text-white border border-white/15 hover:bg-white/5 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                How it works
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
