import { Link } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { Play, ArrowUpRight, CheckCircle2, ChevronDown, ArrowRight, Heart, MessageCircle } from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform, useScroll, type Variants } from "motion/react";
import { servicesData } from "../data/services";
import PricingCard from "../components/PricingCard";
import StatsGraph from "../components/StatsGraph";
import Magnetic from "../components/Magnetic";
import DeviceScrollShowcase from "../components/DeviceScrollShowcase";
import AnalyticsShowcase from "../components/AnalyticsShowcase";

function useAnimatedCounter(start: number, end: number, duration: number, suffix = "", inView = true) {
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!inView) return;
    
    let startTime: number;
    let animationFrame: number;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      setValue(Math.floor(start + (end - start) * percentage));
      
      if (progress < duration) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [start, end, duration, inView]);

  return value.toLocaleString() + suffix;
}

function Counter({ start, end, duration, suffix = "", inView = false }: { start: number, end: number, duration: number, suffix?: string, inView?: boolean }) {
  const val = useAnimatedCounter(start, end, duration, suffix, inView);
  return <>{val}</>;
}


interface FeedCardData {
  id: string;
  state: "rec" | "live";
  count: string;
  caption: string;
  handle: string;
  likes: string;
  scrubDuration: number;
  gradient: string;
  pos: string;
  rotate: number;
  z: number;
  featured?: boolean;
}

const feedCards: FeedCardData[] = [
  {
    id: "a",
    state: "rec",
    count: "2,451",
    caption: "the pitch, unscripted",
    handle: "Margo & Co · UGC",
    likes: "301",
    scrubDuration: 9,
    gradient: "radial-gradient(120% 100% at 25% 15%, #6c4fa3 0%, #2c1f42 55%, #120c1c 100%)",
    pos: "top-[2%] right-[4%] sm:top-[-2%]",
    rotate: 4,
    z: 20,
  },
  {
    id: "b",
    state: "live",
    count: "128K",
    caption: "day 1 of the audit",
    handle: "Ferro Supply · TikTok",
    likes: "14.2K",
    scrubDuration: 6,
    gradient: "radial-gradient(120% 100% at 75% 10%, #ff9169 0%, #d3512f 48%, #2c1109 100%)",
    pos: "top-[22%] right-[34%] sm:top-[16%]",
    rotate: -6,
    z: 30,
    featured: true,
  },
  {
    id: "c",
    state: "rec",
    count: "8,204",
    caption: "before / after",
    handle: "Northloom · Reel",
    likes: "920",
    scrubDuration: 11,
    gradient: "radial-gradient(120% 100% at 20% 90%, #4fc7c2 0%, #1c6b6c 48%, #0a1e1e 100%)",
    pos: "top-[46%] right-[0%] sm:top-[44%]",
    rotate: -3,
    z: 10,
  },
  {
    id: "d",
    state: "rec",
    count: "61.4K",
    caption: "the sound",
    handle: "Booking.co · UGC",
    likes: "3,100",
    scrubDuration: 8,
    gradient: "radial-gradient(120% 100% at 80% 80%, #e2c1ff 0%, #8a5fc4 45%, #1f1330 100%)",
    pos: "top-[60%] right-[36%] sm:top-[58%]",
    rotate: 7,
    z: 5,
  },
];

// Rotate travels with the card via Motion's `custom`, so every card can share
// one variants object instead of each computing its own transition inline.
const feedContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } },
};

const feedCardVariants: Variants = {
  hidden: (rotate: number) => ({ opacity: 0, y: 50, rotate: rotate * 1.8 }),
  visible: (rotate: number) => ({
    opacity: 1,
    y: 0,
    rotate,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const FeedCard: React.FC<{ card: FeedCardData; index: number }> = ({ card, index }) => (
  <motion.div
    custom={card.rotate}
    variants={feedCardVariants}
    whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.25 } }}
    className={`absolute w-[124px] sm:w-[150px] lg:w-[172px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/15 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.65)] flex flex-col justify-between cursor-pointer ${card.pos} ${card.featured ? "outline outline-2 outline-primary outline-offset-2 animate-feed-pulse" : ""}`}
    style={{ zIndex: card.z }}
  >
    <div className="absolute inset-0" style={{ background: card.gradient }} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/30" />

    <div className="relative z-10 flex items-start justify-between p-2.5 text-[#fff]">
      <span className="flex items-center gap-1 text-[9px] font-bold tracking-wide bg-black/35 backdrop-blur-sm pl-1.5 pr-2 py-1 rounded-full">
        <span className={`w-[5px] h-[5px] rounded-full bg-[#ff6b4a] ${card.state === "live" ? "animate-pulse" : ""}`} />
        {card.state === "live" ? "LIVE" : "REC"}
      </span>
      <span className="text-[9px] font-semibold bg-black/35 backdrop-blur-sm px-2 py-1 rounded-full">{card.count}</span>
    </div>

    <div className="relative z-10 flex items-end justify-between gap-1.5 px-2.5 pb-1.5 text-[#fff]">
      <span className="text-[10px] font-bold leading-snug max-w-[74%]">
        {card.caption}
        <span className="block text-[8.5px] font-medium text-[#ffffffa6] mt-0.5">{card.handle}</span>
      </span>
      <span className="flex flex-col items-center gap-1.5 shrink-0">
        <span className="flex flex-col items-center gap-0.5">
          <Heart className="w-3.5 h-3.5 fill-[#fff]" />
          <span className="text-[8px] font-semibold tabular-nums">{card.likes}</span>
        </span>
        <MessageCircle className="w-3.5 h-3.5" />
      </span>
    </div>

    <div className="relative z-10 h-[2px] mx-2.5 mb-2 rounded-full bg-[#ffffff33] overflow-hidden">
      <div
        className="h-full w-full bg-[#fff] origin-left animate-reel-scrub"
        style={{ animationDuration: `${card.scrubDuration}s`, animationDelay: `${index * 0.6}s` }}
      />
    </div>
  </motion.div>
);

// The cluster tilts toward the cursor (spring-smoothed) and drifts away as the
// hero scrolls out of view — the two places Motion actually earns its keep
// over plain CSS: physics-based response to input, and scroll-linked motion.
const FeedCluster: React.FC = () => {
  const clusterRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-8, 8]), springConfig);

  const { scrollYProgress } = useScroll({ target: clusterRef, offset: ["start start", "end start"] });
  const scrollDrift = useTransform(scrollYProgress, [0, 1], [0, 72]);
  const scrollFade = useTransform(scrollYProgress, [0, 1], [1, 0.35]);

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      ref={clusterRef}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      style={{ perspective: 1200 }}
      className="relative h-[420px] sm:h-[480px] lg:h-[540px]"
    >
      <span
        className="absolute z-0 right-[-4%] bottom-[-4%] font-bold text-transparent text-[18vw] sm:text-[10vw] lg:text-[6.5vw] leading-none select-none pointer-events-none hero-display"
        style={{ WebkitTextStroke: "1px rgba(245,242,239,0.08)" }}
        aria-hidden="true"
      >
        FYP
      </span>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={feedContainerVariants}
        style={{ rotateX, rotateY, y: scrollDrift, opacity: scrollFade }}
        className="absolute inset-0"
      >
        {feedCards.map((card, i) => (
          <FeedCard key={card.id} card={card} index={i} />
        ))}
      </motion.div>
    </div>
  );
};

interface PortfolioItemData {
  id: string;
  category: "Social Posts" | "Short-Form" | "UGC";
  title: string;
  meta: string;
  gradient: string;
  aspect: string;
  stat?: string;
  playable?: boolean;
}

// Same gradient-tile language as the hero's feed cards — until real client
// footage is hosted (needs Supabase Storage access), an honest placeholder
// beats a hotlinked stock photo captioned to look like something it isn't.
const portfolioItems: PortfolioItemData[] = [
  { id: "social", category: "Social Posts", title: "Social Media Campaign", meta: "Instagram & Facebook", gradient: "radial-gradient(120% 100% at 20% 15%, #6c4fa3 0%, #241a38 60%, #100c18 100%)", aspect: "aspect-[16/9]", stat: "+300% Engagement" },
  { id: "short-1", category: "Short-Form", title: "The unboxing hook", meta: "TikTok · Reel", gradient: "radial-gradient(120% 100% at 75% 15%, #ff9169 0%, #a83e22 55%, #24100a 100%)", aspect: "aspect-[4/5]", playable: true },
  { id: "short-2", category: "Short-Form", title: "Before / after cut", meta: "Reels · 0:18", gradient: "radial-gradient(120% 100% at 25% 85%, #4fc7c2 0%, #1c5f60 55%, #0a1e1e 100%)", aspect: "aspect-[4/5]", playable: true },
  { id: "short-3", category: "Short-Form", title: "Founder POV", meta: "TikTok · 0:24", gradient: "radial-gradient(120% 100% at 80% 80%, #e2c1ff 0%, #6f4a99 55%, #1f1330 100%)", aspect: "aspect-[4/5]", playable: true },
  { id: "ugc-1", category: "UGC", title: "Unboxing, unscripted", meta: "Creator-shot · Raw", gradient: "radial-gradient(120% 100% at 30% 20%, #ffd166 0%, #a86a1c 55%, #241804 100%)", aspect: "aspect-[16/9]", playable: true },
  { id: "ugc-2", category: "UGC", title: "A day in the studio", meta: "Creator-shot · Raw", gradient: "radial-gradient(120% 100% at 70% 80%, #7fb8ff 0%, #2f5c94 55%, #0c1a2e 100%)", aspect: "aspect-[16/9]", playable: true },
];

const PortfolioTile: React.FC<{ item: PortfolioItemData; className?: string }> = ({ item, className = "" }) => (
  <div className={`bg-surface-container border border-white/10 p-2 md:p-6 rounded-2xl flex flex-col group/tile ${className}`}>
    <div className={`overflow-hidden rounded-xl border border-white/5 relative mb-6 ${item.aspect}`}>
      <div className="absolute inset-0 transition-transform duration-700 group-hover/tile:scale-105" style={{ background: item.gradient }} />
      {item.playable && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/tile:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-black/40 border border-[#ffffff33] text-[#fff] flex items-center justify-center pl-1 backdrop-blur-md">
            <Play className="w-6 h-6" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
    <div className="flex justify-between items-start px-2">
      <div>
        <h3 className="text-base font-bold text-white mb-1">{item.title}</h3>
        <p className="text-xs text-white/50 uppercase tracking-wide font-bold">{item.meta}</p>
      </div>
      {item.stat && <div className="text-xs font-bold text-primary mt-1 px-3 py-1 bg-primary/10 rounded-full whitespace-nowrap">{item.stat}</div>}
    </div>
  </div>
);

const FAQS = [
  { question: "How fast will I receive my content?", answer: "Most orders are delivered within 3 to 5 business days. Short-form video and UGC orders may take slightly longer depending on creator availability, but we always communicate timelines upfront." },
  { question: "Do I need to sign a long-term contract?", answer: "No. All plans are month-to-month. You can pause or cancel anytime with no penalties and no awkward conversations." },
  { question: "What do you need from me to get started?", answer: "After subscribing, you'll fill out a short onboarding questionnaire covering your brand voice, target audience, and content preferences. That's it — we handle the rest." },
  { question: "Can I request revisions?", answer: "Yes. Every order includes revision rounds. If something doesn't feel right, just let us know and we'll fix it until it does." },
  { question: "Do you manage my social media accounts?", answer: "We produce the content and can deliver it ready to post. Full scheduling and account management is available as an add-on — ask us about it during onboarding." },
  { question: "How does the money-back guarantee work?", answer: "If you're not satisfied with your first batch of content, contact us within 14 days of delivery and we'll issue a full refund. No hoops." },
  { question: "Can I buy multiple services at once?", answer: "Absolutely. Many clients stack services — for example, Social Media Posts paired with Short-Form Videos. Add multiple items to your cart and check out in one go." },
  { question: "What industries do you work with?", answer: "We've produced content for e-commerce brands, SaaS companies, local businesses, health and wellness brands, creators, and agencies. If you sell something, we can create content for it." }
];

export default function Home() {
  const statsRef = useRef<HTMLElement>(null);
  const isInView = useInView(statsRef, { once: true, amount: 0.5 });
  const [activeSection, setActiveSection] = useState(servicesData[0].id);
  const [activePortfolioTab, setActivePortfolioTab] = useState("Featured");
  const guaranteeRef = useRef<HTMLDivElement>(null);
  const isGuaranteeInView = useInView(guaranteeRef, { once: true, amount: 0.5 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Hero — Feed Collision: headline the video columns interrupt, staged as a real scroll, not a bento grid */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-28 overflow-hidden border-b border-white/5 bg-background">

        {/* Subtle grid background for agency feel */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay z-0 pointer-events-none"></div>
        <div className="absolute inset-0 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none"></div>
        {/* Rationed glow — one soft lilac wash, not a wall of purple */}
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-primary/10 blur-[120px] z-0 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-8 items-center">

          {/* Left — headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 mb-7 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b4a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b4a]" />
              </span>
              86 campaigns in production right now
            </div>

            <h1 className="hero-display font-bold text-white mb-6 leading-[0.96] tracking-tight text-[13vw] sm:text-[7.5vw] lg:text-[4.6vw] text-balance">
              Stop posting.<br />
              Start <span className="italic text-primary">scrolling</span> them.
            </h1>

            <p className="text-on-surface-variant text-lg sm:text-xl leading-relaxed max-w-lg mb-10">
              Socialio turns your product into the feed people can't swipe past — scripted, shot, edited, and scheduled by a team that lives in the app, not a deck.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
              <Magnetic>
                <Link to="/pricing" className="bg-white text-background px-8 py-4 rounded-lg font-bold text-sm hover:bg-primary transition-all duration-300 flex items-center justify-center gap-2 group">
                  See This Week's Drops <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Magnetic>
              <Magnetic>
                <button className="border border-white/15 text-white px-8 py-4 rounded-lg font-bold text-sm hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 text-primary" fill="currentColor" /> Watch The Reel
                </button>
              </Magnetic>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <span className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg,#8a5fc4,#3a2b52)" }}>JM</span>
                <span className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg,#ff9169,#d3512f)" }}>RK</span>
                <span className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg,#4fc7c2,#1c6b6c)" }}>AT</span>
              </div>
              <p className="text-xs text-on-surface-variant"><span className="text-white font-bold">212 brands</span> currently in production</p>
            </div>
          </motion.div>

          {/* Right — the feed the videos are colliding into */}
          <FeedCluster />

        </div>
      </section>

      <DeviceScrollShowcase />
      <AnalyticsShowcase />

      {/* Compact Tabbed Capabilities Section */}
      <section className="bg-surface-container py-24 md:py-32 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24 items-start">
          
          {/* Left Navigation */}
          <div className="md:col-span-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block">[ Capabilities ]</span>
            <div className="flex flex-col gap-2">
              {servicesData.map((service, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveSection(service.id)}
                  className={`text-left px-6 py-4 rounded-xl transition-all duration-300 font-bold ${activeSection === service.id ? 'bg-white text-background shadow-lg scale-[1.02]' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`}
                >
                  {service.title}
                </button>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="col-span-12 md:col-span-8">
             {servicesData.filter(s => s.id === activeSection).map((service, idx) => (
                <motion.div 
                  key={service.id} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-background rounded-2xl border border-white/10 p-8 md:p-12 shadow-2xl relative overflow-hidden"
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block relative z-10">{service.category}</span>
                  <h4 className="type-level-1 text-white mb-6 leading-tight relative z-10 text-balance">{service.title}</h4>
                  <p className="type-level-3 text-white/70 mb-12 max-w-prose relative z-10">{service.description}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 mb-12 border-t border-white/10 pt-8 relative z-10">
                     {service.features.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-4 type-level-3 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          {f}
                        </div>
                     ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-auto pt-8 border-t border-white/10 relative z-10">
                    <div className="text-left flex items-baseline gap-3">
                      <span className="type-level-4 text-white/50">Starting at</span>
                      <div className="font-display font-bold text-3xl text-white">${service.sliderSteps[0].price}</div>
                    </div>
                    <Link to={`/service/${service.id}`} className="sm:ml-auto px-8 py-4 bg-primary text-background hover:bg-white transition-colors duration-300 rounded-xl font-bold text-sm flex justify-center items-center gap-2">
                      Explore Framework <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
             ))}
          </div>

        </div>
      </section>



      {/* Trusted By Marquee - Clean Minimal */}
      <section className="py-16 bg-surface-container border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 mb-8 text-center md:text-left">
           <p className="text-xs uppercase tracking-[0.1em] text-white/50 font-semibold">Trusted by scaling companies</p>
        </div>
        <div className="overflow-hidden relative">
            <div className="flex gap-16 md:gap-32 items-center px-6 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700 marquee-track whitespace-nowrap">
                {/* Duplicated for seamless scrolling effect */}
                {[1, 2].map((group) => (
                  <div key={group} className="flex gap-16 md:gap-32 items-center text-white font-display tracking-tighter shrink-0 text-xl md:text-3xl font-bold">
                      <span>Lumio Skincare</span>
                      <span>The Fit Club</span>
                      <span>Roast & Co.</span>
                      <span>Nova Apparel</span>
                      <span>Stackd Media</span>
                      <span>Bloom Wellness</span>
                  </div>
                ))}
            </div>
        </div>
      </section>

      {/* Results Section - Streamlined */}
      <section id="stats-section" ref={statsRef} className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight text-balance">Outcomes Over Output.</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats Stack */}
            <div className="flex flex-col gap-12 lg:col-span-1 justify-center">
              <div className="flex flex-col justify-center">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2 font-bold">[ Evidence 01 ]</div>
                 <div className="text-on-surface-variant text-sm mb-1">Pieces of Content Delivered</div>
                 <div className="text-white font-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={8415} duration={1500} suffix="+" inView={isInView} />
                 </div>
              </div>
              <div className="flex flex-col justify-center">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-tertiary mb-2 font-bold">[ Evidence 02 ]</div>
                 <div className="text-on-surface-variant text-sm mb-1">Active Campaigns</div>
                 <div className="text-white font-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={86} duration={2000} inView={isInView} />
                 </div>
              </div>
              <div className="flex flex-col justify-center">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-2 font-bold">[ Evidence 03 ]</div>
                 <div className="text-on-surface-variant text-sm mb-1">Client Retention Rate</div>
                 <div className="text-white font-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={94} duration={2000} suffix="%" inView={isInView} />
                 </div>
              </div>
            </div>
            
            {/* Main Graph */}
            <div className="lg:col-span-2">
              <StatsGraph />
            </div>
          </div>
        </div>
      </section>

      {/* How it Works — an assembly line, staged as one, not three identical boxes */}
      <section className="py-32 md:py-40 bg-background border-b border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full relative z-10">

          <div className="max-w-xl mb-20 md:mb-28">
            <span className="hero-display italic text-primary text-base block mb-4">The Process</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight text-balance leading-[1.05]">
              We turned the agency model into an assembly line.
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              No endless email chains. No ambiguous deliverables. Just a structured sprint built around outcomes, not hours billed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
            {[
              { n: "01", title: "Subscribe & onboard", body: "Select your plan, complete our focused alignment questionnaire, and get access to your dedicated Slack channel within hours." },
              { n: "02", title: "Submit briefs", body: "Use your kanban board to request as many creatives or campaigns as you need. We dissect the brief and get straight to work." },
              { n: "03", title: "Review & scale", body: "Receive your first batch in days. Give feedback in one place. Once approved, we launch, measure, and scale the winners." },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`relative pl-6 border-l border-white/10 ${i === 1 ? "md:mt-16" : i === 2 ? "md:mt-8" : ""}`}
              >
                <span className="hero-display block text-7xl font-bold text-white/10 leading-none mb-6">{step.n}</span>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-on-surface-variant text-[15px] leading-relaxed max-w-xs">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof of Execution (Our Work) */}
      <section className="py-24 md:py-32 bg-background border-y border-white/5 relative overflow-hidden">

        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header - Left Aligned */}
          <div className="mb-16 flex flex-col items-start text-left border-b border-white/10 pb-16">
            <span className="hero-display italic text-primary text-base block mb-4">Evidence Collection</span>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight text-balance">
              High-converting creatives.
            </h2>
            <p className="max-w-prose text-on-surface-variant text-lg md:text-xl leading-relaxed">
              We design assets built specifically to capture attention, reduce friction, and scale your revenue. See what we can do for you.
            </p>
          </div>

          {/* Filter Tabs - Left Aligned */}
          <div className="flex flex-wrap justify-start gap-4 mb-16">
            <button onClick={() => setActivePortfolioTab("Featured")} className={`px-4 py-2 font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'Featured' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>Featured</button>
            <button onClick={() => setActivePortfolioTab("Social Posts")} className={`px-4 py-2 font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'Social Posts' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>Social Posts</button>
            <button onClick={() => setActivePortfolioTab("Short-Form")} className={`px-4 py-2 font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'Short-Form' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>Short-Form</button>
            <button onClick={() => setActivePortfolioTab("UGC")} className={`px-4 py-2 font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'UGC' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>UGC</button>
          </div>

          {/* Work Grid — same gradient-tile language as the hero feed, not stock photos standing in for client work */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Social Posts') && (
               <>
                 <PortfolioTile item={portfolioItems.find(p => p.id === "social")!} className="md:col-span-8" />
                 <div className="md:col-span-4 bg-surface-container border border-white/10 p-8 rounded-2xl flex flex-col justify-center">
                    <h3 className="text-2xl font-bold text-white mb-6">Built to stop the scroll.</h3>
                    <p className="text-on-surface-variant leading-relaxed">We don't just make things look pretty. We engineer creative assets that hack attention and drive meaningful action.</p>
                 </div>
               </>
            )}

            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Short-Form') && (
               <>
                 {portfolioItems.filter(p => p.category === "Short-Form").map((item) => (
                    <PortfolioTile key={item.id} item={item} className="md:col-span-4" />
                 ))}
               </>
            )}

            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'UGC') && (
               <>
                 {portfolioItems.filter(p => p.category === "UGC").map((item) => (
                    <PortfolioTile key={item.id} item={item} className="md:col-span-6" />
                 ))}
               </>
            )}
          </div>
        </div>
          
          {/* Trust Bar */}
          <div className="grid-12 w-full">
            <div className="col-span-12 flex flex-wrap items-center justify-between gap-6 py-12 mt-16 border-y border-white/5 text-on-surface-variant type-level-4">
               <div className="flex items-center gap-2">Vetted Marketers</div>
               <div className="flex items-center gap-2">Fast Turnarounds</div>
               <div className="flex items-center gap-2">Fully Managed</div>
               <div className="flex items-center gap-2">Fixed Pricing</div>
               <div className="flex items-center gap-2">Cancel Anytime</div>
            </div>
          </div>

          {/* Services & Pricing Block */}
          <div className="py-24 md:py-32 border-t border-white/5 grid-12 w-full items-end mb-16">
            <div className="col-span-12 md:col-span-6 lg:col-span-7 pr-8">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block">Socialio Pricing Structure</span>
              <h2 className="type-level-1 text-white text-balance">
                Flat-rate services.<br/>No surprises.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 lg:col-span-5 pb-4 mt-8 md:mt-0">
              <p className="type-level-3">
                Simple, transparent pricing. Everything you need to scale your social media presence without the agency overhead.
              </p>
            </div>
          </div>
          
          <div className="grid-12 w-full">
            <div className="col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
               {servicesData.filter(s => ["social-media-posts", "short-form-videos", "seo-blog-posts"].includes(s.id)).slice(0, 3).map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <PricingCard service={service} />
                  </motion.div>
               ))}
            </div>
          </div>
            
            <div className="mt-16 flex items-center justify-center gap-8 md:gap-16 flex-wrap text-center opacity-80">
              <div className="font-sans">
                 <div className="font-bold text-3xl text-white mb-1">200+</div>
                 <div className="text-sm text-on-surface-variant font-medium">5-Star Reviews</div>
              </div>
              <div className="font-sans">
                 <div className="font-bold text-3xl text-white mb-1">100%</div>
                 <div className="text-sm text-on-surface-variant font-medium">Money-Back Guarantee</div>
              </div>
              <div className="font-sans">
                 <div className="font-bold text-3xl text-white mb-1">50+</div>
                 <div className="text-sm text-on-surface-variant font-medium">Vetted Creators</div>
              </div>
            </div>

          {/* Minimal Guarantee Block */}
          <div ref={guaranteeRef} className="py-24 md:py-32 border-t border-white/5 grid-12 w-full items-start">
             <div className="col-span-12 md:col-span-6 lg:col-span-5 pr-8">
               <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block">
                 Ironclad Guarantee
               </span>
               <h3 className="type-level-2 text-white mb-6 text-balance">
                 Results in 14 days.<br />
                 <span className="text-white/50">Or it's free.</span>
               </h3>
               <p className="type-level-3 mb-8 max-w-prose">
                 We are so confident in our creative output that every new engagement comes with a 14-day absolute satisfaction guarantee. No friction, no endless email chains.
               </p>
               <div className="space-y-4">
                 <div className="flex items-start gap-4">
                   <div className="w-1.5 h-1.5 bg-primary mt-2 rounded-full shrink-0"></div>
                   <p className="type-level-3 text-sm">Full 14 days to review your first batch of creatives and align with your dedicated squad.</p>
                 </div>
                 <div className="flex items-start gap-4">
                   <div className="w-1.5 h-1.5 bg-primary mt-2 rounded-full shrink-0"></div>
                   <p className="type-level-3 text-sm">Multiple revision rounds automatically baked into the sprint timeline to ensure exact brand alignment.</p>
                 </div>
               </div>
             </div>

             <div className="col-span-12 md:col-span-6 lg:col-start-8 mt-16 md:mt-0">
               <div className="relative aspect-square flex flex-col items-center justify-center p-8 bg-surface-container rounded-3xl shadow-xl border border-white/5">
                  <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-lg"></div>
                  <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/10 rounded-tr-lg"></div>
                  <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/10 rounded-bl-lg"></div>
                  <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/10 rounded-br-lg"></div>
                  
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-4 block">[ Contract ]</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Sprint Day</span>
                  <span className="text-9xl font-display font-bold text-white tracking-tighter drop-shadow-2xl">
                    <Counter start={0} end={14} duration={1200} inView={isGuaranteeInView} />
                  </span>
                  
                  <div className="mt-8 flex items-center gap-2">
                     <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/80">Guaranteed</span>
                  </div>
               </div>
             </div>
          </div>
      </section>

      {/* Quiet Section */}
      <section className="section-quiet">
         <div className="text-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-6 block">04 &mdash; Our Work</span>
            <h2 className="type-level-1 text-white leading-none text-balance">We make things<br/>people actually<br/>notice.</h2>
         </div>
      </section>

      {/* FAQ Section */}
      <section className="section-quiet bg-background border-t border-white/5">
        <div className="grid-12 w-full">
          <div className="col-span-12 lg:col-span-5 mb-16 lg:mb-0 pr-8">
             <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block">[ Information ]</span>
            <h2 className="type-level-2 text-white leading-tight text-balance">Questions<br/>we get a lot.</h2>
          </div>
          <div className="col-span-12 lg:col-span-7 flex flex-col">
            {FAQS.map((faq, index) => (
              <div key={index} className="border-t border-white/10 last:border-b">
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full py-6 flex items-center justify-between text-left group"
                >
                  <span className="text-lg font-medium text-white group-hover:text-primary transition-colors pr-8">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-white/30 flex-shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-96 opacity-100 pb-8' : 'max-h-0 opacity-0'}`}
                >
                  <p className="type-level-3">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — closes on the same "posting vs. scrolling" line the hero opened with, not a generic purple-flood CTA */}
      <section className="py-28 md:py-36 bg-background border-t border-white/5 relative overflow-hidden">
        <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-[#ff6b4a]/10 blur-[120px] z-0 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <h2 className="hero-display font-bold text-white text-4xl md:text-6xl leading-[1.05] tracking-tight text-balance max-w-xl">
              Your competitors are still posting.<br />
              <span className="italic text-primary">You could be scrolling them.</span>
            </h2>
            <p className="text-on-surface-variant text-sm font-bold mt-5">Now booking for next month.</p>
          </div>

          <Magnetic>
            <Link to="/contact" className="shrink-0 px-10 py-5 bg-white text-background rounded-lg font-bold text-sm hover:bg-primary transition-all duration-300 flex items-center gap-2 group">
              Start The Audit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Magnetic>
        </div>
      </section>
    </>
  );
}
