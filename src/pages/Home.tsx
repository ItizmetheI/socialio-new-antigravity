import { Link } from "react-router-dom";
import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { ArrowUpRight, CheckCircle2, ChevronDown, ArrowRight } from "lucide-react";
import { motion, useInView } from "motion/react";
import { servicesData } from "../data/services";
import PricingCard from "../components/PricingCard";
import Magnetic from "../components/Magnetic";
import DeviceScrollShowcase from "../components/DeviceScrollShowcase";
import HeroScrollWord from "../components/HeroScrollWord";
import AnalyticsShowcase from "../components/AnalyticsShowcase";

// recharts is the heaviest dependency on this page and this chart sits well
// below the fold — split it out so it never delays first paint.
const StatsGraph = lazy(() => import("../components/StatsGraph"));

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


interface PortfolioItemData {
  id: string;
  category: "Social Posts" | "Short-Form" | "UGC";
  title: string;
  meta: string;
  gradient: string;
  aspect: string;
  stat?: string;
}

// Same gradient-tile language as the hero's feed cards — until real client
// footage is hosted (needs Supabase Storage access), an honest placeholder
// beats a hotlinked stock photo captioned to look like something it isn't.
const portfolioItems: PortfolioItemData[] = [
  { id: "social", category: "Social Posts", title: "Social Media Campaign", meta: "Instagram & Facebook", gradient: "radial-gradient(120% 100% at 20% 15%, #6c4fa3 0%, #241a38 60%, #100c18 100%)", aspect: "aspect-[16/9]", stat: "+300% Engagement" },
  { id: "short-1", category: "Short-Form", title: "The unboxing hook", meta: "TikTok · Reel", gradient: "radial-gradient(120% 100% at 75% 15%, #ff9169 0%, #a83e22 55%, #24100a 100%)", aspect: "aspect-[4/5]" },
  { id: "short-2", category: "Short-Form", title: "Before / after cut", meta: "Reels · 0:18", gradient: "radial-gradient(120% 100% at 25% 85%, #4fc7c2 0%, #1c5f60 55%, #0a1e1e 100%)", aspect: "aspect-[4/5]" },
  { id: "short-3", category: "Short-Form", title: "Founder POV", meta: "TikTok · 0:24", gradient: "radial-gradient(120% 100% at 80% 80%, #e2c1ff 0%, #6f4a99 55%, #1f1330 100%)", aspect: "aspect-[4/5]" },
  { id: "ugc-1", category: "UGC", title: "Unboxing, unscripted", meta: "Creator-shot · Raw", gradient: "radial-gradient(120% 100% at 30% 20%, #ffd166 0%, #a86a1c 55%, #241804 100%)", aspect: "aspect-[16/9]" },
  { id: "ugc-2", category: "UGC", title: "A day in the studio", meta: "Creator-shot · Raw", gradient: "radial-gradient(120% 100% at 70% 80%, #7fb8ff 0%, #2f5c94 55%, #0c1a2e 100%)", aspect: "aspect-[16/9]" },
];

// Not a link and no video behind it yet — so no hover zoom or play button
// pretending otherwise (same reasoning as the Examples page tiles).
const PortfolioTile: React.FC<{ item: PortfolioItemData; className?: string }> = ({ item, className = "" }) => (
  <div className={`bg-surface-container border border-white/10 p-2 md:p-6 rounded-2xl flex flex-col ${className}`}>
    <div className={`overflow-hidden rounded-xl border border-white/5 relative mb-6 ${item.aspect}`}>
      <div className="absolute inset-0" style={{ background: item.gradient }} />
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
  { question: "Do you manage my social media accounts?", answer: "Social Media Posts plans include scheduled posting — we can post for you once you grant access, or hand over ready-to-post files. Every other service is delivered as finished files to your dashboard." },
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
      <HeroScrollWord />

      <DeviceScrollShowcase />
      <AnalyticsShowcase />

      {/* Compact Tabbed Capabilities Section */}
      <section className="bg-surface-container py-24 md:py-32 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24 items-start">
          
          {/* Left Navigation */}
          <div>
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
          <div className="min-w-0 md:col-span-2">
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
                      <div className="hero-display font-bold text-3xl text-white">${service.sliderSteps[0].price}</div>
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
                  <div key={group} className="flex gap-16 md:gap-32 items-center text-white hero-display tracking-tighter shrink-0 text-xl md:text-3xl font-bold">
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
            <h2 className="hero-display font-bold text-3xl md:text-5xl text-white tracking-tight text-balance">
              <span className="italic text-primary">Outcomes</span> over output.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats Stack */}
            <div className="flex flex-col gap-12 lg:col-span-1 justify-center">
              <div className="flex flex-col justify-center">
                 <div className="text-on-surface-variant text-sm mb-1">Pieces of Content Delivered</div>
                 <div className="text-white hero-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={8415} duration={1500} suffix="+" inView={isInView} />
                 </div>
              </div>
              <div className="flex flex-col justify-center">
                 <div className="text-on-surface-variant text-sm mb-1">Active Campaigns</div>
                 <div className="text-white hero-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={86} duration={2000} inView={isInView} />
                 </div>
              </div>
              <div className="flex flex-col justify-center">
                 <div className="text-on-surface-variant text-sm mb-1">Client Retention Rate</div>
                 <div className="text-white hero-display text-5xl md:text-6xl font-bold tracking-tighter">
                   <Counter start={0} end={94} duration={2000} suffix="%" inView={isInView} />
                 </div>
              </div>
            </div>
            
            {/* Main Graph */}
            <div className="lg:col-span-2">
              <Suspense fallback={<div className="min-h-[300px]" />}>
                <StatsGraph />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works — an assembly line, staged as one, not three identical boxes */}
      <section id="how-it-works" className="py-32 md:py-40 bg-background border-b border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">

          <div className="max-w-xl mb-20 md:mb-28">
            <span className="hero-display italic text-primary text-base block mb-4">The Process</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight text-balance leading-[1.05]">
              Premium social media management without the agency overhead.
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              No endless email chains. No ambiguous deliverables. Just a structured sprint built around outcomes, not hours billed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
            {[
              { n: "01", title: "Check out & onboard", body: "Pick your services, check out, and answer a short questionnaire about your brand, audience, and goals." },
              { n: "02", title: "Approve your plan", body: "We curate a plan — deliverables, platforms, cadence — and send it to your dashboard. Approve it or ask for changes." },
              { n: "03", title: "Track & review", body: "Work moves across your board from requested to delivered. Review each piece and leave feedback in one place." },
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
              <h2 className="type-level-1 text-white text-balance">
                Unbelievable<br/>pricing plans.
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
               <h3 className="type-level-2 text-white mb-6 text-balance">
                 Money back<br />
                 <span className="text-white/50">guaranteed.</span>
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
                  
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Sprint Day</span>
                  <span className="text-9xl hero-display font-bold text-white tracking-tighter drop-shadow-2xl">
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
            <h2 className="type-level-1 text-white leading-none text-balance">We make things<br/>people actually<br/>notice.</h2>
         </div>
      </section>

      {/* FAQ Section */}
      <section className="section-quiet bg-background border-t border-white/5">
        <div className="grid-12 w-full">
          <div className="col-span-12 lg:col-span-5 mb-16 lg:mb-0 pr-8">
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
        <div
          className="absolute bottom-[-440px] right-[-440px] w-[1120px] h-[1120px] z-0 pointer-events-none"
          style={{ background: "radial-gradient(circle closest-side, rgba(255, 107, 74, 0.1) 0%, rgba(255, 107, 74, 0.1) 18%, rgba(255, 107, 74, 0.05) 50%, transparent 100%)" }}
        />
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          <div>
            <h2 className="hero-display font-bold text-white text-4xl md:text-6xl leading-[1.05] tracking-tight text-balance max-w-xl">
              Your competitors are still posting.<br />
              <span className="italic text-primary">Are you ready to dominate?</span>
            </h2>
            <p className="text-on-surface-variant text-sm font-bold mt-5">Now booking for next month.</p>
          </div>

          <Magnetic>
            <Link to="/contact" className="shrink-0 px-10 py-5 bg-white text-background rounded-lg font-bold text-sm hover:bg-primary transition-all duration-300 flex items-center gap-2 group">
              Talk to us <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Magnetic>
        </div>
      </section>
    </>
  );
}
