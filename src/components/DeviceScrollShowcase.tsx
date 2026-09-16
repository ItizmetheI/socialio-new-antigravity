import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import Magnetic from "./Magnetic";

// A scroll-driven cinematic sequence: a phone scrolls through three reels,
// then zooms through the screen into the Socialio wordmark. 600vh of scroll
// track is deliberate — this is one held interaction, not a series of
// separate scroll-triggered reveals, so the breakpoints below are tuned
// against that full distance.
export default function DeviceScrollShowcase() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // No extra spring here: the site already wraps everything in <ReactLenis
  // root> (App.tsx), which smooths scroll physics itself. Layering a second
  // spring on top of Lenis's own smoothing double-smooths the signal and
  // makes the whole sequence lag noticeably behind the actual scroll input.
  // Home.tsx's FeedCluster already proves raw scrollYProgress + useTransform
  // tracks correctly under this site's Lenis setup — same pattern here.
  const smoothProgress = scrollYProgress;

  // 1. Entrance (0 - 0.15)
  const phoneRotateX = useTransform(smoothProgress, [0, 0.15], [45, 0]);
  const phoneY = useTransform(smoothProgress, [0, 0.15], ["30vh", "0vh"]);
  const glareY = useTransform(phoneRotateX, [45, 0], ["100%", "-100%"]);

  // 2. Scrolling the reels (0.15 - 0.55)
  const reelsY = useTransform(
    smoothProgress,
    [0.15, 0.25, 0.35, 0.45, 0.55],
    ["0%", "0%", "-33.33%", "-33.33%", "-66.66%"]
  );

  // 3. The engulfing zoom through the screen (0.65 - 0.95)
  const phoneScale = useTransform(smoothProgress, [0.65, 0.75, 0.85, 0.95], [1, 3, 20, 200]);
  const phoneBorderOpacity = useTransform(smoothProgress, [0.65, 0.75], [1, 0]);
  const phoneRadius = useTransform(smoothProgress, [0.65, 0.8], ["54px", "0px"]);
  const innerRadius = useTransform(smoothProgress, [0.65, 0.8], ["44px", "0px"]);

  // 4. Wordmark reveal inside the last reel
  const textOpacity = useTransform(smoothProgress, [0.75, 0.85], [1, 0]);
  const textScale = useTransform(smoothProgress, [0.75, 0.9], [1, 8]);
  const textBlur = useTransform(smoothProgress, [0.75, 0.85], ["blur(0px)", "blur(20px)"]);
  const textTracking = useTransform(smoothProgress, [0.75, 0.85], ["-0.05em", "0.2em"]);

  return (
    <section id="reel-showcase" ref={containerRef} className="h-[600vh] relative bg-background">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden perspective-[1200px]">
        <div className="absolute inset-0 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none" />

        {/* Phase text */}
        <motion.div
          style={{ opacity: useTransform(smoothProgress, [0.05, 0.15, 0.6, 0.65], [0, 1, 1, 0]) }}
          className="absolute top-16 max-w-2xl text-center z-0 px-6"
        >
          <p className="hero-display font-bold text-[clamp(1.5rem,4vw,2.5rem)] text-white tracking-tight text-balance">
            The scroll people <span className="italic text-primary">don&apos;t skip.</span>
          </p>
        </motion.div>

        {/* The device */}
        <motion.div
          style={{
            rotateX: phoneRotateX,
            y: phoneY,
            scale: phoneScale,
            borderRadius: phoneRadius,
            borderColor: `rgba(255, 255, 255, ${phoneBorderOpacity})`,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
          className="relative w-[320px] h-[680px] bg-surface-container p-[10px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] z-10 origin-center will-change-transform"
        >
          <motion.div style={{ borderRadius: innerRadius }} className="relative w-full h-full bg-[#151018] overflow-hidden">
            {/* Glass glare */}
            <motion.div
              style={{ top: glareY }}
              className="absolute left-0 right-0 h-[150%] bg-gradient-to-b from-transparent via-white/10 to-transparent -rotate-12 pointer-events-none z-40 mix-blend-overlay"
            />

            {/* Dynamic Island */}
            <motion.div
              style={{ opacity: useTransform(smoothProgress, [0.6, 0.65], [1, 0]) }}
              className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[32px] bg-black rounded-[20px] z-30 shadow-sm flex items-center justify-end px-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse opacity-80" />
            </motion.div>

            {/* Reels track */}
            <motion.div style={{ y: reelsY }} className="w-full h-[300%] flex flex-col will-change-transform">
              {/* Reel 1 — bright, stops the scroll */}
              <div className="w-full h-1/3 bg-[#EAE7E0] relative flex items-center justify-center p-6 overflow-hidden">
                <div className="relative z-10 text-center">
                  <h3 className="hero-display text-5xl font-bold text-stone-900 tracking-tighter mb-2">Stop</h3>
                  <p className="text-sm font-bold text-stone-500 uppercase tracking-widest">The Scroll</p>
                </div>
                <ReelOverlay dark />
              </div>

              {/* Reel 2 — coral block */}
              <div className="w-full h-1/3 bg-[#ff6b4a] relative flex items-center justify-center p-6 overflow-hidden">
                <div className="relative z-10 text-center">
                  <h3 className="hero-display text-5xl font-bold text-white tracking-tighter mb-2">Engage</h3>
                  <p className="text-sm font-bold text-white/70 uppercase tracking-widest">The Mind</p>
                </div>
                <ReelOverlay />
              </div>

              {/* Reel 3 — the gateway into the brand */}
              <div className="w-full h-1/3 bg-background relative flex items-center justify-center p-6 overflow-hidden">
                <motion.div
                  style={{ opacity: textOpacity, scale: textScale, filter: textBlur, letterSpacing: textTracking }}
                  className="relative z-10 flex flex-col items-center justify-center origin-center"
                >
                  <p className="hero-display text-5xl font-bold text-white" aria-hidden="true">socialio</p>
                </motion.div>
                <motion.div
                  style={{ opacity: textOpacity }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-10 h-10 shadow-[0_0_120px_60px_rgba(221,183,255,0.25)] rounded-full mix-blend-screen" />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function ReelOverlay({ dark }: { dark?: boolean }) {
  const color = dark ? "text-stone-900" : "text-white";
  const [likes, setLikes] = useState(124);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  return (
    <>
      <div className={`absolute right-4 bottom-24 flex flex-col gap-5 items-center ${color} z-20`}>
        <div className="flex flex-col items-center gap-1">
          <Magnetic strength={0.3}>
            <button onClick={handleLike} className="p-2 hover:scale-110 transition-transform cursor-pointer">
              <Heart className="w-7 h-7" strokeWidth={1.5} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </Magnetic>
          <span className="text-[10px] font-bold">{likes}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Magnetic strength={0.3}>
            <button className="p-2 hover:scale-110 transition-transform cursor-pointer">
              <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
            </button>
          </Magnetic>
          <span className="text-[10px] font-bold">42</span>
        </div>
        <Magnetic strength={0.3}>
          <button className="p-2 hover:scale-110 transition-transform cursor-pointer mt-2">
            <Share2 className="w-7 h-7" strokeWidth={1.5} />
          </button>
        </Magnetic>
        <Magnetic strength={0.3}>
          <button className="p-2 hover:scale-110 transition-transform cursor-pointer">
            <Bookmark className="w-7 h-7" strokeWidth={1.5} />
          </button>
        </Magnetic>
      </div>

      <div className="absolute left-6 bottom-12 right-20 z-20">
        <div className="w-full h-[1px] bg-current opacity-20 mb-4" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-current opacity-40 flex items-center justify-center p-1">
            <div className="w-full h-full rounded-full bg-current opacity-60" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-2 rounded-full bg-current opacity-40 w-24" />
            <div className="h-1.5 rounded-full bg-current opacity-20 w-16" />
          </div>
        </div>
      </div>
    </>
  );
}
