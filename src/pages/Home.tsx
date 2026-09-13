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
  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 rounded-[14px]">
    <div className="bg-surface-container border border-white/5 text-white/70 px-4 py-2 rounded-sm text-[10px] uppercase tracking-[0.1em] flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
      View <ArrowUpRight className="w-3 h-3" />
    </div>
  </div>
);

const CarouselCard: React.FC<CarouselCardProps> = ({ item, columnIndex }) => {
  if (item.type === 'social') {
    return (
      <div className="w-full aspect-square bg-[#111] rounded-[14px] shrink-0 relative group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-transform duration-300 hover:scale-[1.02]">
        <HoverOverlay />
        <div className="absolute inset-0 flex flex-col p-3 pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
               <img src={`https://picsum.photos/seed/${item.seed}_avatar/50/50`} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="text-[10px] font-bold text-white">Superior</div>
          </div>
          <div className="flex-grow rounded-lg overflow-hidden relative">
             <img src={`https://picsum.photos/seed/${item.seed}/200/200`} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2 mt-2">
             <div className="w-3 h-3 rounded-full border border-white/50"></div>
             <div className="w-3 h-3 rounded-full border border-white/50"></div>
             <div className="w-3 h-3 ml-auto rounded-sm border border-white/50"></div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <div className="w-full aspect-[9/16] bg-[#1a1a1a] rounded-[14px] shrink-0 relative group shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden">
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
      <div className="w-full aspect-video bg-[#222] rounded-[14px] shrink-0 relative group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-transform duration-300 hover:scale-[1.02] flex flex-col overflow-hidden">
        <HoverOverlay />
        <div className="h-5 bg-white/5 flex items-center gap-1.5 px-3">
           <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
        </div>
        <img src={`https://picsum.photos/seed/${item.seed}/300/170`} alt="" className="flex-grow w-full object-cover opacity-90" />
      </div>
    );
  }

  if (item.type === 'blog') {
    return (
      <div className="w-full h-[220px] bg-white rounded-[14px] shrink-0 relative group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-transform duration-300 hover:scale-[1.02] flex flex-col overflow-hidden">
        <HoverOverlay />
        <div className="h-[100px] relative">
          <img src={`https://picsum.photos/seed/${item.seed}/200/100`} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="p-4 flex flex-col flex-grow">
           <h4 className="text-black font-bold text-xs mb-1 line-clamp-2 leading-tight">How to scale your operations effortlessly</h4>
           <p className="text-gray-500 text-[10px] line-clamp-3 leading-relaxed mt-1">Discover the proven frameworks that top-tier companies use to automate their workflows and increase productivity by 300% without adding headcount.</p>
        </div>
      </div>
    );
  }

  return null;
}

function HeroCarousel() {
  const { playingColumnIndex } = useActiveVideo();

  return (
    <div className="absolute inset-0 lg:left-0 lg:w-full h-full gap-4 z-20 flex overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)] group/carousel pointer-events-none">
      {/* Column 1 - Slide Up */}
      <div 
        className={`flex-1 flex flex-col gap-3 pb-3 animate-slide-up hover:[animation-play-state:paused] pointer-events-auto ${playingColumnIndex === 1 ? '[animation-play-state:paused]' : ''}`}
        style={{ animationDuration: '30s' }}
      >
        {[...col1Items, ...col1Items].map((item, i) => (
            <CarouselCard key={`col1-${i}`} item={item} columnIndex={1} />
        ))}
      </div>
      
      {/* Column 2 - Slide Down */}
      <div 
        className={`flex-1 flex flex-col gap-3 pb-3 animate-slide-down hover:[animation-play-state:paused] pointer-events-auto ${playingColumnIndex === 2 ? '[animation-play-state:paused]' : ''}`} 
        style={{ animationDuration: '40s' }}
      >
        {[...col2Items, ...col2Items].map((item, i) => (
            <CarouselCard key={`col2-${i}`} item={item} columnIndex={2} />
        ))}
      </div>

      {/* Column 3 - Slide Up */}
      <div 
        className={`flex-1 flex flex-col gap-3 pb-3 animate-slide-up hover:[animation-play-state:paused] pointer-events-auto ${playingColumnIndex === 3 ? '[animation-play-state:paused]' : ''}`} 
        style={{ animationDuration: '25s' }}
      >
        {[...col3Items, ...col3Items].map((item, i) => (
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
  const [activeHeroTab, setActiveHeroTab] = useState(servicesData[0].category || "Social Media");
  const [activePortfolioTab, setActivePortfolioTab] = useState("Featured");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const guaranteeRef = useRef<HTMLDivElement>(null);
  const guaranteeInView = useInView(guaranteeRef, { once: true, amount: 0.5 });
  // Instead of a janky manual setInterval, use our own useAnimatedCounter hook!
  const guaranteeDay = useAnimatedCounter(0, 14, 1500, "", guaranteeInView);

  // Get unique categories for tabs
  const categories = Array.from(new Set(servicesData.map(s => s.category)));

  // Get the first service in the active category to preview
  const previewService = servicesData.find(s => s.category === activeHeroTab) || servicesData[0];

  return (
    <>
      {/* High-Impact Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 max-w-7xl mx-auto min-h-[90vh] flex flex-col justify-center border-b border-white/5">
        {/* Background elements */}

        {/* Removed decorative mesh gradient */}

        <div className="grid-12 w-full items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="col-span-12 lg:col-span-6 w-full pr-0 lg:pr-12"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-background bg-surface-container flex items-center justify-center overflow-hidden z-[${5-i}]`}>
                     <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-primary gap-0.5 mb-1">
                  <Star className="w-4 h-4 fill-primary" /><Star className="w-4 h-4 fill-primary" /><Star className="w-4 h-4 fill-primary" /><Star className="w-4 h-4 fill-primary" /><Star className="w-4 h-4 fill-primary" />
                </div>
                <div className="text-xs font-semibold text-white/70 uppercase tracking-[0.1em]">
                  Trusted by 200+ brands
                </div>
              </div>
            </div>
            
            <h1 className="type-level-1 text-white mb-8">
              Stop Guessing. <br className="hidden md:block" />
              <span>Start Scaling.</span>
            </h1>

            <p className="type-level-3 max-w-xl mb-12 border-l-2 border-primary/30 pl-6">
              From scroll-stopping social content to ranking-ready blog posts — we handle your entire content operation so you can focus on running the business.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full">
              <Link to="/pricing" className="bg-primary text-background px-8 py-4 rounded-xl font-bold text-base w-full sm:w-auto hover:bg-primary-hover transition-colors shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)] hover:shadow-primary/50 text-center relative overflow-hidden group block">
                 <span className="relative z-10 flex items-center justify-center gap-2">View Our Pricing <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </Link>
              <button className="bg-surface-container border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-base w-full sm:w-auto hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                 <Play className="w-5 h-5" /> See How It Works
              </button>
            </div>
            
          </motion.div>

          {/* Right Side: Refined Vertical Carousel */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-7 mt-16 lg:mt-0 relative h-[600px] lg:h-full">
            <ActiveVideoProvider>
               <HeroCarousel />
            </ActiveVideoProvider>
          </div>
        </div>
      </section>

      {/* Interactive Service Selector - Extracted to its own section for pacing */}
      <section className="section-quiet bg-surface-container/30 border-y border-white/5 py-24">
        <div className="grid-12 w-full">
           <div className="col-span-12 max-w-4xl mx-auto w-full">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                 <div className="py-8 relative overflow-hidden">
                    
                    <h2 className="type-level-2 text-white mb-10 tracking-tight text-center">What do you need help with?</h2>
                    
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                      {categories.map((cat, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setActiveHeroTab(cat)}
                          className={`px-6 py-3 rounded-sm font-sans text-sm font-semibold transition-all ${activeHeroTab === cat ? 'bg-white text-black shadow-lg scale-100' : 'bg-surface-container text-on-surface-variant hover:bg-white/10 hover:text-white border border-white/5'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Preview Card */}
                    <div className="border-y border-white/10 py-12 transition-all flex flex-col md:flex-row items-center gap-8">
                       <div className="flex-grow w-full">
                         <div className="flex items-center gap-5 mb-5">
                           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                             <CheckCircle2 className="w-6 h-6" />
                           </div>
                           <div>
                             <h4 className="type-level-3 font-bold text-white mb-1">{previewService.title}</h4>
                             <div className="font-sans text-sm text-on-surface-variant max-w-md">{previewService.description}</div>
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                            {previewService.features.slice(0, 4).map((f: string, i: number) => (
                               <div key={i} className="flex items-start gap-3 text-sm text-on-surface-variant font-sans">
                                 <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5 opacity-80" />
                                 {f}
                               </div>
                            ))}
                         </div>
                       </div>
                       
                       <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full md:w-auto gap-4 md:gap-3 shrink-0 md:pl-10 md:border-l border-white/5 h-full py-2">
                         <div className="text-left">
                           <span className="type-level-4 text-on-surface-variant block mb-2">Starting at</span>
                           <div className="font-display font-bold text-4xl text-white">${previewService.sliderSteps[0].price}<span className="text-base font-sans font-normal text-on-surface-variant">/mo</span></div>
                         </div>
                         <Link to={`/service/${previewService.id}`} className="mt-4 px-8 py-4 w-full text-center bg-white text-black hover:bg-gray-200 transition-colors rounded-xl font-bold text-sm flex justify-center items-center gap-2">
                           Explore <ArrowUpRight className="w-4 h-4" />
                         </Link>
                       </div>
                    </div>
                 </div>
              </motion.div>
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
      <section id="stats-section" ref={statsRef} className="py-20 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Outcomes Over Output.</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats Stack - Typography & Dividers instead of Cards (Task 5: Destroy Card Soup) */}
            <div className="flex flex-col gap-8 lg:col-span-1 justify-center">
              <div className="flex flex-col justify-center border-l-2 border-primary/20 pl-6">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">Pieces of Content Delivered</div>
                 <div className="text-white font-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={8415} duration={1500} suffix="+" inView={isInView} />
                 </div>
              </div>
              <div className="flex flex-col justify-center border-l-2 border-tertiary/20 pl-6">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">Active Campaigns</div>
                 <div className="text-white font-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={86} duration={2000} inView={isInView} />
                 </div>
              </div>
              <div className="flex flex-col justify-center border-l-2 border-secondary/20 pl-6">
                 <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">Client Retention Rate</div>
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

      {/* How it Works - Editorial Split (Task 1: Kill AI Templates, Task 4: Stop Centering) */}
      <section className="section-quiet bg-background border-t border-white/5 relative">
        <div className="grid-12 w-full relative z-10">
          {/* Left Column: Title */}
          <div className="col-span-12 lg:col-span-5 mb-16 lg:mb-0">
            <span className="type-level-4 text-primary block mb-8">The Process</span>
            <h2 className="type-level-2 text-white mb-8 lg:pr-8">We simplified the agency model into a predictable, frictionless assembly line.</h2>
            <p className="type-level-3 lg:pr-12">No endless email chains. No ambiguous deliverables. Just a structured sprint for growth built entirely around producing outcomes over output.</p>
          </div>
          
          {/* Right Column: Steps (Asymmetric Layout) */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-7 flex flex-col gap-16">
             <div className="flex gap-8 items-start group">
               <div className="type-level-4 text-white/30 pt-1 shrink-0 group-hover:text-primary transition-colors">01</div>
               <div className="border-t border-white/10 pt-4 flex-grow">
                 <h3 className="type-level-3 font-bold text-white mb-4">Subscribe & Onboard</h3>
                 <p className="type-level-3 text-sm">Select your plan, complete our focused alignment questionnaire, and get access to your dedicated Slack channel within hours.</p>
               </div>
             </div>
             
             <div className="flex gap-8 items-start group">
               <div className="type-level-4 text-white/30 pt-1 shrink-0 group-hover:text-tertiary transition-colors">02</div>
               <div className="border-t border-white/10 pt-4 flex-grow">
                 <h3 className="type-level-3 font-bold text-white mb-4">Submit Briefs</h3>
                 <p className="type-level-3 text-sm">Use your kanban board to request as many creatives or campaigns as you need. We dissect the brief and get straight to work.</p>
               </div>
             </div>
             
             <div className="flex gap-8 items-start group">
               <div className="type-level-4 text-white/30 pt-1 shrink-0 group-hover:text-secondary transition-colors">03</div>
               <div className="border-t border-white/10 pt-4 flex-grow">
                 <h3 className="type-level-3 font-bold text-white mb-4">Review & Scale</h3>
                 <p className="type-level-3 text-sm">Receive your first batch in days. Provide feedback seamlessly. Once approved, we launch, measure, and scale the winners.</p>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Proof of Execution (Our Work) */}
      <section className="py-24 md:py-32 bg-surface-container-lowest border-y border-outline-variant/10 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="mb-16 flex flex-col items-center text-center">
            <span className="text-primary font-mono text-xs uppercase tracking-widest mb-4 block">Our Portfolio</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tighter">
              High-Converting Creatives
            </h2>
            <p className="max-w-2xl text-on-surface-variant font-sans text-lg md:text-xl leading-relaxed">
              We design assets built specifically to capture attention, reduce friction, and scale your revenue. See what we can do for you.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            <button onClick={() => setActivePortfolioTab("Featured")} className={`px-6 py-3 font-mono font-bold text-xs uppercase tracking-widest rounded flex items-center gap-2 transition-all duration-300 ${activePortfolioTab === 'Featured' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105' : 'bg-transparent border border-white/10 hover:bg-white/5 text-white'}`}><Sparkles className="w-4 h-4"/> Featured</button>
            <button onClick={() => setActivePortfolioTab("Social Posts")} className={`px-6 py-3 font-mono font-bold text-xs uppercase tracking-widest rounded flex items-center gap-2 transition-all duration-300 ${activePortfolioTab === 'Social Posts' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105' : 'bg-transparent border border-white/10 hover:bg-white/5 text-white'}`}><Image className="w-4 h-4"/> Social Posts</button>
            <button onClick={() => setActivePortfolioTab("Short-Form")} className={`px-6 py-3 font-mono font-bold text-xs uppercase tracking-widest rounded flex items-center gap-2 transition-all duration-300 ${activePortfolioTab === 'Short-Form' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105' : 'bg-transparent border border-white/10 hover:bg-white/5 text-white'}`}><Video className="w-4 h-4"/> Short-Form</button>
            <button onClick={() => setActivePortfolioTab("UGC")} className={`px-6 py-3 font-mono font-bold text-xs uppercase tracking-widest rounded flex items-center gap-2 transition-all duration-300 ${activePortfolioTab === 'UGC' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105' : 'bg-transparent border border-white/10 hover:bg-white/5 text-white'}`}><UserSquare2 className="w-4 h-4"/> UGC</button>
          </div>

          {/* Work Grid - Bento Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Box 1: Social Media Posts */}
            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Social Posts') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }} 
              transition={{ duration: 0.5 }} 
              className="border-t border-white/10 pt-8 hover:bg-white/[0.02] transition-colors relative group"
            >
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3 text-white">
                   <div className="p-2 rounded-lg bg-surface-container border border-white/10"><Image className="w-4 h-4 text-on-surface-variant" /></div>
                   <span className="font-bold font-sans text-lg md:text-xl">Social Media Posts</span>
                 </div>
                 
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl overflow-hidden relative group/img aspect-square border border-white/5"><img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400&h=400" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Post" /></div>
                  <div className="rounded-xl overflow-hidden relative group/img aspect-square border border-white/5"><img src="https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?auto=format&fit=crop&q=80&w=400&h=400" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Post" /></div>
                  <div className="rounded-xl overflow-hidden relative group/img aspect-square border border-white/5"><img src="https://images.unsplash.com/photo-1504270997636-07ddfbd48948?auto=format&fit=crop&q=80&w=400&h=400" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Post" /></div>
                  <div className="rounded-xl overflow-hidden relative group/img aspect-square border border-white/5"><img src="https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&q=80&w=400&h=400" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Post" /></div>
               </div>
            </motion.div>
            )}
            
            {/* Box 2: Short-Form Videos */}
            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Short-Form') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }} 
              transition={{ duration: 0.5, delay: 0.1 }} 
              className="border-t border-white/10 pt-8 hover:bg-white/[0.02] transition-colors relative group"
            >
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3 text-white">
                   <div className="p-2 rounded-lg bg-surface-container border border-white/10"><Video className="w-4 h-4 text-on-surface-variant" /></div>
                   <span className="font-bold font-sans text-lg md:text-xl">Short-Form Videos</span>
                 </div>
                 
               </div>
               <div className="grid grid-cols-2 gap-4 h-[350px]">
                  <div className="rounded-xl overflow-hidden relative group/vid h-full border border-white/5 bg-black">
                     <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=400&h=711" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/vid:scale-105 transition-transform duration-700 group-hover/vid:opacity-90" alt="Video" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pl-0.5 group-hover/vid:bg-white group-hover/vid:text-black group-hover/vid:scale-110 transition-all cursor-pointer">
                           <Play className="w-5 h-5 overflow-visible" fill="currentColor" />
                        </div>
                     </div>
                  </div>
                  <div className="rounded-xl overflow-hidden relative group/vid h-full border border-white/5 bg-black">
                     <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400&h=711" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/vid:scale-105 transition-transform duration-700 group-hover/vid:opacity-90" alt="Video" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pl-0.5 group-hover/vid:bg-white group-hover/vid:text-black group-hover/vid:scale-110 transition-all cursor-pointer">
                           <Play className="w-5 h-5 overflow-visible" fill="currentColor" />
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
            )}

            {/* Box 3: Blog & SEO */}
            {(activePortfolioTab === 'Featured') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }} 
              transition={{ duration: 0.5, delay: 0.2 }} 
              className="border-t border-white/10 pt-8 hover:bg-white/[0.02] transition-colors relative group"
            >
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3 text-white">
                   <div className="p-2 rounded-lg bg-surface-container border border-white/10"><MonitorPlay className="w-4 h-4 text-on-surface-variant" /></div>
                   <span className="font-bold font-sans text-lg md:text-xl">Blog & SEO</span>
                 </div>
                 
               </div>
               <div className="grid grid-cols-2 gap-4 h-[350px]">
                  <div className="rounded-xl overflow-hidden relative group/vid h-full flex flex-col bg-black border border-white/5">
                     <div className="relative flex-grow min-h-[250px]">
                        <img src="https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&q=80&w=400&h=711" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/vid:opacity-90 transition-opacity" alt="Video Ad" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md text-black flex items-center justify-center pl-0.5 group-hover/vid:scale-110 group-hover/vid:bg-primary transition-all cursor-pointer">
                              <Play className="w-5 h-5 overflow-visible" fill="currentColor" />
                          </div>
                        </div>
                     </div>
                     <div className="h-[3px] bg-white/10 relative shrink-0">
                         <div className="absolute top-0 left-0 h-full bg-primary w-1/3"></div>
                     </div>
                  </div>
                  <div className="rounded-xl overflow-hidden relative group/vid h-full flex flex-col bg-black border border-white/5">
                     <div className="relative flex-grow min-h-[250px]">
                        <img src="https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?auto=format&fit=crop&q=80&w=400&h=711" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/vid:opacity-90 transition-opacity" alt="Video Ad" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-md text-black flex items-center justify-center pl-0.5 group-hover/vid:scale-110 group-hover/vid:bg-primary transition-all cursor-pointer">
                              <Play className="w-5 h-5 overflow-visible" fill="currentColor" />
                          </div>
                        </div>
                     </div>
                     <div className="h-[3px] bg-white/10 relative shrink-0">
                         <div className="absolute top-0 left-0 h-full bg-primary w-2/3"></div>
                     </div>
                  </div>
               </div>
            </motion.div>
            )}

            {/* Box 4: Social Media Posts */}
            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'Social Posts') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }} 
              transition={{ duration: 0.5, delay: 0.3 }} 
              className="border-t border-white/10 pt-8 hover:bg-white/[0.02] transition-colors relative group"
            >
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3 text-white">
                   <div className="p-2 rounded-lg bg-surface-container border border-white/10"><Layers className="w-4 h-4 text-on-surface-variant" /></div>
                   <span className="font-bold font-sans text-lg md:text-xl">Social Media Posts</span>
                 </div>
                 
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl overflow-hidden relative group/img aspect-[3/4] border border-white/5"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400&h=533" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Ad" /></div>
                  <div className="rounded-xl overflow-hidden relative group/img aspect-[3/4] border border-white/5"><img src="https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&q=80&w=400&h=533" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Ad" /></div>
                  <div className="rounded-xl overflow-hidden relative group/img aspect-[3/4] border border-white/5"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400&h=533" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Ad" /></div>
                  <div className="rounded-xl overflow-hidden relative group/img aspect-[3/4] border border-white/5"><img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400&h=533" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 hover:opacity-100" alt="Ad" /></div>
               </div>
            </motion.div>
            )}

            {/* Box 5: UGC (Span full width) */}
            {(activePortfolioTab === 'Featured' || activePortfolioTab === 'UGC') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }} 
              transition={{ duration: 0.5 }} 
              className="lg:col-span-2 border-t border-white/10 pt-8 hover:bg-white/[0.02] transition-colors relative group"
            >
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3 text-white">
                   <div className="p-2 rounded-lg bg-surface-container border border-white/10"><UserSquare2 className="w-4 h-4 text-on-surface-variant" /></div>
                   <span className="font-bold font-sans text-lg md:text-xl">UGC Videos</span>
                 </div>
                 
               </div>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {[1,2,3,4].map((i) => (
                    <div key={`ugc-${i}`} className="rounded-xl overflow-hidden relative group/vid aspect-[9/16] border border-white/5 bg-black">
                         <img src={`https://images.unsplash.com/photo-${1551288049 + i * 100}?auto=format&fit=crop&q=80&w=400&h=711&sig=${i}`} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/vid:opacity-90 group-hover/vid:scale-105 transition-all duration-700" alt="UGC" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pl-0.5 group-hover/vid:bg-white group-hover/vid:text-black group-hover/vid:scale-110 transition-all cursor-pointer">
                               <Play className="w-4 h-4 overflow-visible" fill="currentColor" />
                            </div>
                         </div>
                         <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
                            <div className={`h-full bg-secondary ${i === 1 ? 'w-1/4' : i === 2 ? 'w-1/2' : i === 3 ? 'w-3/4' : 'w-[90%]'}`}></div>
                         </div>
                      </div>
                 ))}
               </div>
            </motion.div>
            )}
          </div>
        </div>
          
          {/* Trust Bar */}
          <div className="grid-12 w-full">
            <div className="col-span-12 flex flex-wrap items-center justify-between gap-6 py-12 mt-16 border-y border-white/5 text-on-surface-variant type-level-4">
               <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary/50" /> Vetted Marketers</div>
               <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary/50" /> Fast Turnarounds</div>
               <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-secondary/50" /> Fully Managed</div>
               <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary/50" /> Fixed Pricing</div>
               <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary/50" /> Cancel Anytime</div>
            </div>
          </div>

          {/* Services & Pricing Block */}
          <div className="mt-32 pt-16 border-t border-white/5 grid-12 w-full items-end mb-16">
            <div className="col-span-12 md:col-span-6 lg:col-span-7 pr-8">
              <span className="type-level-4 text-primary block mb-6">KB Growth Pricing Structure</span>
              <h2 className="type-level-1 text-white">
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

          {/* Minimal Guarantee Block (Task 7: Remove excessive rounded borders) */}
          <div ref={guaranteeRef} className="mt-32 pt-16 border-t border-white/5 grid-12 w-full items-start">
             <div className="col-span-12 md:col-span-6 lg:col-span-5 pr-8">
               <div className="type-level-4 text-primary mb-8">
                 Ironclad Guarantee
               </div>
               <h3 className="type-level-2 text-white mb-6">
                 Results in 14 days.<br />
                 <span className="text-white/50">Or it's free.</span>
               </h3>
               <p className="type-level-3 mb-8">
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
               <div className="relative aspect-square flex flex-col items-center justify-center border border-white/10 p-8">
                  <span className="type-level-4 text-on-surface-variant mb-4">Sprint Day</span>
                  <span className="type-level-1 text-white">{guaranteeDay}</span>
                  
                  <div className="mt-8 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     <span className="type-level-4 text-white">Guaranteed</span>
                  </div>
               </div>
             </div>
          </div>
      </section>

      {/* Quiet Section (Task 11) */}
      <section className="section-quiet">
         <div className="text-center">
            <span className="type-level-4 text-white/50 mb-12 block">04 &mdash; Our Work</span>
            <h2 className="type-level-1 text-white leading-none">We make things<br/>people actually<br/>notice.</h2>
         </div>
      </section>

      {/* FAQ Section */}
      <section className="section-quiet bg-surface-container border-t border-white/5">
        <div className="grid-12 w-full">
          <div className="col-span-12 lg:col-span-5 mb-16 lg:mb-0 pr-8">
             <span className="type-level-4 text-primary mb-8 block">FAQ</span>
            <h2 className="type-level-2 text-white leading-tight">Questions<br/>we get a lot.</h2>
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

      {/* Clean Minimal CTA (Task 6: Brutalist CTA) */}
      <section className="section-quiet bg-background">
        <div className="w-full max-w-7xl mx-auto px-6 text-center flex flex-col items-center">
            <span className="type-level-4 text-primary mb-8 flex items-center gap-2 justify-center">
               <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span> Initialize Growth
            </span>
            <h2 className="type-level-1 text-white mb-12">
              Ready to Dominate?
            </h2>
            <p className="type-level-3 max-w-2xl mx-auto mb-16">
              Book a strategy call with our growth engineers. We'll audit your current setup and show you exactly where you're leaving money on the table.
            </p>
            <Link to="/contact" className="px-12 py-6 bg-white text-black type-level-4 hover:bg-primary hover:text-white transition-colors duration-300 inline-block">
              Start The Audit &rarr;
            </Link>
        </div>
      </section>
    </>
  );
}
