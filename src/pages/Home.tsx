import { Link } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { BarChart3, Route, MousePointerClick, Play, Sparkles, Image, Video, UserSquare2, ArrowUpRight, MonitorPlay, Layers, CheckCircle2, Activity, Star, ChevronDown, ArrowRight } from "lucide-react";
import { motion, useInView } from "motion/react";
import { servicesData } from "../data/services";
import PricingCard from "../components/PricingCard";
import StatsGraph from "../components/StatsGraph";
import CustomPlayer from "../components/CustomPlayer";
import { ActiveVideoProvider, useActiveVideo } from "../context/VideoContext";

import SpotlightCard from "../components/SpotlightCard";
import TextReveal from "../components/TextReveal";
import Magnetic from "../components/Magnetic";

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


const col1Items = [
  { type: 'social', seed: '11', tag: 'Social Media' },
  { type: 'video', url: 'https://streamable.com/a69bm3', label: 'Reel', tag: 'Video' },
  { type: 'website', seed: 'w1', tag: 'Website' },
  { type: 'blog', seed: 'b1', tag: 'Blog' },
  { type: 'social', seed: '12', tag: 'Social Media' },
  { type: 'video', url: 'https://streamable.com/30ffri', label: 'Short', tag: 'Video' },
  { type: 'website', seed: 'w2', tag: 'Website' },
];

const col2Items = [
  { type: 'video', url: 'https://streamable.com/e25yp1', label: 'Reel', tag: 'Video' },
  { type: 'website', seed: 'w3', tag: 'Website' },
  { type: 'blog', seed: 'b2', tag: 'Email' },
  { type: 'social', seed: '13', tag: 'Social Media' },
  { type: 'video', url: 'https://streamable.com/e3xzs4', label: 'Short', tag: 'Video' },
  { type: 'social', seed: '14', tag: 'Social Media' },
  { type: 'website', seed: 'w4', tag: 'Website' },
];

const col3Items = [
  { type: 'website', seed: 'w5', tag: 'Website' },
  { type: 'blog', seed: 'b3', tag: 'Blog' },
  { type: 'social', seed: '15', tag: 'Social Media' },
  { type: 'video', url: 'https://streamable.com/a69bm3', label: 'Reel', tag: 'Video' },
  { type: 'website', seed: 'w6', tag: 'Website' },
  { type: 'social', seed: '16', tag: 'Social Media' },
  { type: 'video', url: 'https://streamable.com/30ffri', label: 'Short', tag: 'Video' },
];

interface CarouselCardProps {
  item: any;
  columnIndex: number;
}

const HoverOverlay = () => (
  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
    <div className="bg-background border border-white/20 text-white px-4 py-2 text-[10px] uppercase tracking-[0.1em] flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
      View <ArrowUpRight className="w-3 h-3" />
    </div>
  </div>
);

const CarouselCard: React.FC<CarouselCardProps> = ({ item, columnIndex }) => {
  if (item.type === 'social') {
    return (
      <div className="w-full aspect-square bg-[#111] shrink-0 relative group cursor-pointer shadow-2xl transition-transform duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
        <HoverOverlay />
        <div className="absolute inset-0 flex flex-col p-4 pt-6">
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow-md">[ Social ]</div>
          </div>
          <div className="absolute inset-0 z-0">
             <img src={`https://picsum.photos/seed/${item.seed}/200/200`} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <div className="w-full aspect-[9/16] bg-[#1a1a1a] shrink-0 relative group overflow-hidden shadow-2xl rounded-2xl">
        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10 opacity-50 group-hover:opacity-20 transition-opacity" />
        
        {/* We use CustomPlayer with pointer events auto when playing */}
        <div className="absolute inset-0 -z-0">
           <CustomPlayer url={item.url} playing={false} loop={true} muted={true} columnIndex={columnIndex} />
        </div>
      </div>
    );
  }

  if (item.type === 'website') {
    return (
      <div className="w-full aspect-video bg-[#222] shrink-0 relative group cursor-pointer transition-transform duration-300 hover:-translate-y-2 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
        <HoverOverlay />
        <div className="h-6 bg-white/5 flex items-center px-4 border-b border-white/5 relative z-10">
           <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Browser</div>
        </div>
        <div className="flex-grow overflow-hidden relative">
          <img src={`https://picsum.photos/seed/${item.seed}/300/170`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        </div>
      </div>
    );
  }

  if (item.type === 'blog') {
    return (
      <div className="w-full h-[220px] bg-white shrink-0 relative group cursor-pointer transition-transform duration-300 hover:-translate-y-2 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
        <HoverOverlay />
        <div className="h-[100px] relative overflow-hidden">
          <img src={`https://picsum.photos/seed/${item.seed}/200/100`} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        </div>
        <div className="p-5 flex flex-col flex-grow">
           <h4 className="text-black font-bold text-sm mb-1 line-clamp-2 leading-tight">How to scale your operations effortlessly</h4>
           <p className="text-gray-600 text-xs line-clamp-3 leading-relaxed mt-2">Discover the proven frameworks that top-tier companies use to automate their workflows and increase productivity by 300% without adding headcount.</p>
        </div>
      </div>
    );
  }

  return null;
}

function HeroCarousel() {
  const { playingColumnIndex } = useActiveVideo();

  return (
    <div className="absolute inset-0 h-full gap-8 z-20 flex justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_30%,black_70%,transparent_100%)] group/carousel pointer-events-none">
      {/* Column 1 - Slide Up */}
      <div 
        className={`w-full max-w-[280px] flex flex-col gap-8 pb-8 animate-slide-up hover:[animation-play-state:paused] pointer-events-auto ${playingColumnIndex === 1 ? '[animation-play-state:paused]' : ''}`}
        style={{ animationDuration: '45s' }}
      >
        {[...col1Items, ...col1Items, ...col1Items].map((item, i) => (
            <CarouselCard key={`col1-${i}`} item={item} columnIndex={1} />
        ))}
      </div>
      
      {/* Column 2 - Slide Down */}
      <div 
        className={`w-full max-w-[280px] flex flex-col gap-8 pb-8 animate-slide-down hover:[animation-play-state:paused] pointer-events-auto ${playingColumnIndex === 2 ? '[animation-play-state:paused]' : ''}`} 
        style={{ animationDuration: '60s' }}
      >
        {[...col2Items, ...col2Items, ...col2Items].map((item, i) => (
            <CarouselCard key={`col2-${i}`} item={item} columnIndex={2} />
        ))}
      </div>

      {/* Column 3 - Slide Up */}
      <div 
        className={`w-full max-w-[280px] hidden md:flex flex-col gap-8 pb-8 animate-slide-up hover:[animation-play-state:paused] pointer-events-auto ${playingColumnIndex === 3 ? '[animation-play-state:paused]' : ''}`} 
        style={{ animationDuration: '50s' }}
      >
        {[...col3Items, ...col3Items, ...col3Items].map((item, i) => (
            <CarouselCard key={`col3-${i}`} item={item} columnIndex={3} />
        ))}
      </div>
    </div>
  );
}

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
  const [guaranteeDay, setGuaranteeDay] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let day = 0;
          const interval = setInterval(() => {
            day++;
            setGuaranteeDay(day);
            if (day >= 14) clearInterval(interval);
          }, 80);
        }
      },
      { threshold: 0.5 }
    );
    if (guaranteeRef.current) {
      observer.observe(guaranteeRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* High-Impact Asymmetric Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 min-h-[90vh] flex flex-col justify-center border-b border-white/5 overflow-hidden">
        {/* Subtle grid background for agency feel */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay z-0 pointer-events-none"></div>
        <div className="absolute inset-0 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 items-center relative z-10 gap-12">
            
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col items-start text-left lg:pr-12"
          >
            <div className="flex items-center gap-3 mb-8 bg-surface-container/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-xl">
              <div className="flex text-primary gap-0.5">
                <Star className="w-3.5 h-3.5 fill-primary" /><Star className="w-3.5 h-3.5 fill-primary" /><Star className="w-3.5 h-3.5 fill-primary" /><Star className="w-3.5 h-3.5 fill-primary" /><Star className="w-3.5 h-3.5 fill-primary" />
              </div>
              <div className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.15em] border-l border-white/20 pl-3">
                Proven by 200+ Scaling Brands
              </div>
            </div>

            <div className="type-level-1 text-white mb-6 tracking-tighter leading-[0.95] text-[12vw] sm:text-[8vw] lg:text-[6vw] drop-shadow-2xl text-balance">
              <TextReveal>Stop Guessing.</TextReveal><br/>
              <span className="text-primary drop-shadow-[0_0_15px_rgba(221,183,255,0.3)]">
                <TextReveal>Start Scaling.</TextReveal>
              </span>
            </div>

            <p className="type-level-3 max-w-prose mb-12 text-on-surface-variant text-lg sm:text-xl leading-relaxed">
              From scroll-stopping social content to ranking-ready blog posts — we handle your entire content operation so you can focus on running the business.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-start gap-6 w-full sm:w-auto">
              <Magnetic>
                <Link to="/pricing" className="bg-primary text-background px-10 py-5 rounded-full font-black text-base w-full sm:w-auto hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(221,183,255,0.3)] text-center relative group block">
                   <span className="relative z-10 flex items-center justify-center gap-2">View Our Pricing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                </Link>
              </Magnetic>
              <Magnetic>
                <button className="bg-surface-container border border-white/10 text-white px-10 py-5 rounded-full font-bold text-base w-full sm:w-auto hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md">
                   <Play className="w-5 h-5 text-primary" /> See How It Works
                </button>
              </Magnetic>
            </div>
          </motion.div>
        </div>

        {/* 3-Column Premium Bleed Carousel */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute right-0 top-32 bottom-0 w-full lg:w-[48vw] hidden lg:block pointer-events-none z-0"
        >
           <ActiveVideoProvider>
             <HeroCarousel />
           </ActiveVideoProvider>
        </motion.div>
      </section>

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
                  className={`text-left px-6 py-4 rounded-xl transition-all duration-300 font-bold ${activeSection === service.id ? 'bg-white text-black shadow-lg scale-[1.02]' : 'text-on-surface-variant hover:text-white hover:bg-white/5'}`}
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
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Layers className="w-48 h-48" /></div>
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

      {/* How it Works - Editorial Split */}
      <section className="section-quiet bg-background border-t border-white/5 relative">
        <div className="grid-12 w-full relative z-10">
          {/* Left Column: Title */}
          <div className="col-span-12 lg:col-span-5 mb-16 lg:mb-0">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block">[ System ]</span>
            <h2 className="type-level-2 text-white mb-8 lg:pr-8 text-balance">We simplified the agency model into a predictable assembly line.</h2>
            <p className="type-level-3 lg:pr-12 max-w-prose">No endless email chains. No ambiguous deliverables. Just a structured sprint for growth built entirely around producing outcomes over output.</p>
          </div>
          
          {/* Right Column: Steps (Asymmetric Layout) */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-7 flex flex-col gap-6">
             <div className="flex gap-8 items-start group bg-surface-container p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
               <div className="type-level-4 text-white/30 pt-1 shrink-0 group-hover:text-primary transition-colors">01</div>
               <div className="flex-grow">
                 <h3 className="type-level-3 font-bold text-white mb-4">Subscribe & Onboard</h3>
                 <p className="type-level-3 text-sm">Select your plan, complete our focused alignment questionnaire, and get access to your dedicated Slack channel within hours.</p>
               </div>
             </div>
             
             <div className="flex gap-8 items-start group bg-surface-container p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
               <div className="type-level-4 text-white/30 pt-1 shrink-0 group-hover:text-tertiary transition-colors">02</div>
               <div className="flex-grow">
                 <h3 className="type-level-3 font-bold text-white mb-4">Submit Briefs</h3>
                 <p className="type-level-3 text-sm">Use your kanban board to request as many creatives or campaigns as you need. We dissect the brief and get straight to work.</p>
               </div>
             </div>
             
             <div className="flex gap-8 items-start group bg-surface-container p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
               <div className="type-level-4 text-white/30 pt-1 shrink-0 group-hover:text-secondary transition-colors">03</div>
               <div className="flex-grow">
                 <h3 className="type-level-3 font-bold text-white mb-4">Review & Scale</h3>
                 <p className="type-level-3 text-sm">Receive your first batch in days. Provide feedback seamlessly. Once approved, we launch, measure, and scale the winners.</p>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Proof of Execution (Our Work) */}
      <section className="py-24 md:py-32 bg-background border-y border-white/5 relative overflow-hidden">
        
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header - Left Aligned */}
          <div className="mb-16 flex flex-col items-start text-left border-b border-white/10 pb-16">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-6 block">[ Evidence Collection ]</span>
            <h2 className="font-display text-5xl md:text-6xl font-bold text-white mb-8 tracking-tighter text-balance">
              High-Converting Creatives.
            </h2>
            <p className="max-w-prose text-on-surface-variant font-sans text-lg md:text-xl leading-relaxed">
              We design assets built specifically to capture attention, reduce friction, and scale your revenue. See what we can do for you.
            </p>
          </div>

          {/* Filter Tabs - Left Aligned */}
          <div className="flex flex-wrap justify-start gap-4 mb-16">
            <button onClick={() => setActivePortfolioTab("Featured")} className={`px-4 py-2 font-mono font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'Featured' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>Featured</button>
            <button onClick={() => setActivePortfolioTab("Social Posts")} className={`px-4 py-2 font-mono font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'Social Posts' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>Social Posts</button>
            <button onClick={() => setActivePortfolioTab("Short-Form")} className={`px-4 py-2 font-mono font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'Short-Form' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>Short-Form</button>
            <button onClick={() => setActivePortfolioTab("UGC")} className={`px-4 py-2 font-mono font-bold text-[10px] uppercase tracking-widest border-b-2 transition-all duration-300 ${activePortfolioTab === 'UGC' ? 'border-primary text-white' : 'border-transparent text-white/40 hover:text-white'}`}>UGC</button>
          </div>

          {/* Work Grid - Asymmetrical Editorial Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 gap-x-8">
            
            {/* Row 1: Featured Project (Span 8) + Text (Span 4) */}
            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Social Posts') && (
               <>
                 <div className="md:col-span-8 group/img">
                   <div className="overflow-hidden aspect-video bg-surface-container mb-4 rounded-2xl shadow-lg border border-white/5">
                     <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Post" />
                   </div>
                   <div className="flex justify-between items-start">
                      <div>
                        <h3 className="type-level-3 font-bold text-white mb-1">Social Media Campaign</h3>
                        <p className="type-level-4 text-white/50">Instagram & Facebook</p>
                      </div>
                      <div className="type-level-4 text-primary mt-1">+300% Engagement</div>
                   </div>
                 </div>
                 <div className="md:col-span-4 flex flex-col justify-center border-t border-white/10 pt-8 mt-8 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-8">
                    <h3 className="type-level-2 text-white mb-6">Built to stop the scroll.</h3>
                    <p className="type-level-3 mb-8">We don't just make things look pretty. We engineer creative assets that hack attention and drive meaningful action.</p>
                 </div>
               </>
            )}
            
            {/* Row 2: Short-Form (3 Columns) */}
            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Short-Form') && (
               <>
                 {[1,2,3].map((i) => (
                    <div key={i} className="md:col-span-4 group/vid">
                       <div className="overflow-hidden aspect-[9/16] bg-surface-container relative mb-4 rounded-2xl shadow-lg border border-white/5">
                          <img src={`https://images.unsplash.com/photo-${1551288049 + i * 100}?auto=format&fit=crop&q=80&w=600`} className="w-full h-full object-cover transition-transform duration-700 group-hover/vid:scale-105" alt="Video" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                             <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white flex items-center justify-center pl-1">
                                <Play className="w-6 h-6" fill="currentColor" />
                             </div>
                          </div>
                       </div>
                       <div>
                          <h3 className="type-level-3 font-bold text-white mb-1">Short-Form Content</h3>
                          <p className="type-level-4 text-white/50">TikTok & Reels</p>
                       </div>
                    </div>
                 ))}
               </>
            )}

            {/* Row 3: Blog / Editorial (Span 6 + Span 6) */}
            {(activePortfolioTab === 'Featured') && (
               <>
                 <div className="md:col-span-6 group/img mt-8 pt-8">
                   <div className="overflow-hidden aspect-[16/9] bg-surface-container mb-4 rounded-2xl shadow-lg border border-white/5">
                     <img src="https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Blog" />
                   </div>
                   <h3 className="type-level-3 font-bold text-white mb-1">SEO & Editorial</h3>
                   <p className="type-level-4 text-white/50">Long-form content</p>
                 </div>
                 <div className="md:col-span-6 group/img mt-8 pt-8">
                   <div className="overflow-hidden aspect-[16/9] bg-surface-container mb-4 rounded-2xl shadow-lg border border-white/5">
                     <img src="https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Blog" />
                   </div>
                   <h3 className="type-level-3 font-bold text-white mb-1">Industry Reports</h3>
                   <p className="type-level-4 text-white/50">B2B Strategy</p>
                 </div>
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
                  <span className="text-9xl font-display font-bold text-white tracking-tighter drop-shadow-2xl">{guaranteeDay}</span>
                  
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

      {/* Clean Minimal CTA */}
      <section className="py-32 bg-primary">
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-12 md:mb-0">
               <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/50 mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full"></span> Initialize Growth
               </span>
               <h2 className="type-level-1 text-black text-balance">
                 Ready to Dominate?
               </h2>
            </div>
            
            <Link to="/contact" className="px-12 py-6 bg-black text-primary type-level-4 hover:bg-white hover:text-black transition-colors duration-300 inline-block border border-black group">
              Start The Audit <span className="inline-block group-hover:translate-x-2 transition-transform duration-300">&rarr;</span>
            </Link>
        </div>
      </section>
    </>
  );
}
