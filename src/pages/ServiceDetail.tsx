import { useParams, Link } from "react-router-dom";
import { servicesData, addOnsData } from "../data/services";
import { CheckCircle2, ChevronDown, ArrowLeft, ShoppingCart, ShieldCheck, Star, TrendingUp, Target, Zap, Users, LineChart } from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "motion/react";
import { useCart } from "../context/CartContext";
import CustomPlayer from "../components/CustomPlayer";

const faqs = [
  { question: "How quickly will I receive my first delivery?", answer: "Within 3 to 5 business days of completing your onboarding brief." },
  { question: "How many revisions do I get?", answer: "As many as you need until you're happy. We don't cap revisions." },
  { question: "Can I upgrade or downgrade my volume?", answer: "Yes. You can change your tier at the start of any new billing cycle." },
  { question: "Is there a contract?", answer: "No contracts. Cancel or pause anytime." },
];

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const service = servicesData.find((s) => s.id === id);
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { addToCart, setIsCartOpen } = useCart();
  const proofRef = useRef(null);
  const isProofInView = useInView(proofRef, { once: true });

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32 pb-24 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="hero-display text-4xl font-bold text-white mb-6">Service Not Found</h1>
          <p className="font-sans text-on-surface-variant mb-8">We couldn't find the service you're looking for.</p>
          <Link to="/services" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const currentStepInfo = service.sliderSteps[activeStep] || service.sliderSteps[0];
  const maxStep = service.sliderSteps.length - 1;

  const handleAddToCart = () => {
    addToCart({
      serviceId: service.id,
      title: service.title,
      levelLabel: currentStepInfo.label,
      price: currentStepInfo.price,
      type: "service",
    });
    setIsCartOpen(true);
  };

  const handleAddAddon = (addon: any) => {
    addToCart({
      serviceId: addon.id,
      title: addon.title,
      levelLabel: "One-time",
      price: addon.price,
      type: "addon",
    });
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pt-32 pb-24 text-on-surface">


      <main className="max-w-7xl mx-auto px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-12 font-sans">
          <Link to="/services" className="hover:text-primary transition-colors">Services</Link>
          <span>/</span>
          <span className="text-white font-medium">{service.title}</span>
        </div>

        {/* HERO — 2 col sticky layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-16 items-start mb-32">

          {/* LEFT — scrollable content */}
          <div className="xl:col-span-7 flex flex-col gap-20">

            {/* Title + description */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="font-mono text-xs text-primary uppercase tracking-widest font-bold mb-4">{service.category}</div>
              <h1 className="hero-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 text-white leading-tight">{service.title}</h1>
              <p className="font-sans text-xl text-on-surface-variant leading-relaxed max-w-2xl">{service.longDescription}</p>
            </motion.div>

            {/* What's Included */}
            <div>
              <h2 className="hero-display text-2xl font-bold text-white mb-6">What's included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {service.features.map((feature: string, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.07 }}
                    className="flex items-center gap-3 bg-surface-container border border-white/5 rounded-xl p-4"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-white font-sans">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Proof stats */}
            {service.proofs && service.proofs.length > 0 && (
              <div ref={proofRef}>
                <h2 className="hero-display text-2xl font-bold text-white mb-6">By the numbers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {service.proofs.map((proof: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isProofInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: idx * 0.15 }}
                      className="bg-surface-container border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/20 transition-all"
                    >

                      {idx % 2 === 0
                        ? <TrendingUp className="w-7 h-7 text-primary mb-4" />
                        : <Target className="w-7 h-7 text-purple-400 mb-4" />
                      }
                      <div className="text-4xl font-black text-white mb-1 tracking-tight">{proof.value}</div>
                      <div className="text-xs text-on-surface-variant font-mono uppercase tracking-widest mb-3 font-bold">{proof.label}</div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{proof.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Process steps */}
            {service.process && service.process.length > 0 && (
              <div>
                <h2 className="hero-display text-2xl font-bold text-white mb-8">How we do it</h2>
                <div className="flex flex-col gap-4">
                  {service.process.map((step: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: idx * 0.1 }}
                      className="flex items-start gap-5 bg-surface-container border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center hero-display font-bold text-sm shrink-0 bg-primary/15 text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1 font-sans">{step.title}</h3>
                        <p className="text-sm text-on-surface-variant leading-relaxed font-sans">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Getting Started 3-step */}
            <div>
              <h2 className="hero-display text-2xl font-bold text-white mb-8 text-center">Getting started</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                <div className="hidden md:block absolute top-7 left-[18%] right-[18%] h-px bg-white/10" />
                {[
                  { n: "1", title: "Subscribe & Brief Us", body: "Choose your volume, fill the onboarding form, and tell us about your brand in under 10 minutes." },
                  { n: "2", title: "We Get to Work", body: "Your dedicated team starts producing immediately — no waiting on approvals before we begin." },
                  { n: "3", title: "Review & Repeat", body: "Receive content, request revisions, approve. We repeat the cycle every month like clockwork." },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-background border border-white/10 rounded-full flex items-center justify-center hero-display text-xl font-bold text-white mb-4 relative z-10">{s.n}</div>
                    <h3 className="font-bold text-white mb-2 font-sans">{s.title}</h3>
                    <p className="text-sm text-on-surface-variant font-sans">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* First 7 Days */}
            <div className="bg-surface-container border border-white/5 rounded-3xl p-8 relative overflow-hidden">

              <h2 className="hero-display text-2xl font-bold text-white mb-2">Your first 7 days</h2>
              <p className="text-on-surface-variant font-sans mb-8 text-sm">What happens right after you check out.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <Zap className="w-5 h-5" />, title: "Workspace Setup", body: "Instant invite to your dedicated Slack channel and Notion dashboard." },
                  { icon: <Users className="w-5 h-5" />, title: "Kickoff Call", body: "Meet your account manager. Align on deliverables, tone, and timeline." },
                  { icon: <LineChart className="w-5 h-5" />, title: "First Delivery", body: "Within a week your first batch is ready for review." },
                ].map((item, i) => (
                  <div key={i} className="bg-background/50 border border-white/5 rounded-2xl p-5">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white mb-4">{item.icon}</div>
                    <div className="font-bold text-white mb-1 text-sm font-sans">{item.title}</div>
                    <p className="text-xs text-on-surface-variant font-sans leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <h2 className="hero-display text-2xl font-bold text-white mb-6">Recommended add-ons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addOnsData.map((addon: any) => (
                  <div key={addon.id} className="bg-surface-container border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-white/15 transition-colors">
                    <div className="mb-6">
                      <div className="font-sans text-xl font-bold text-white mb-1">+${addon.price}</div>
                      <h4 className="font-bold text-white mb-2 font-sans">{addon.title}</h4>
                      <p className="text-sm text-on-surface-variant font-sans">{addon.description}</p>
                    </div>
                    <button onClick={() => handleAddAddon(addon)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-lg border border-white/10 transition-colors">
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="hero-display text-2xl font-bold text-white mb-8">FAQ</h2>
              <div className="flex flex-col">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-white/5">
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full py-6 flex items-center justify-between text-left group"
                    >
                      <span className="hero-display font-bold text-white text-lg group-hover:text-primary transition-colors pr-8">{faq.question}</span>
                      <ChevronDown className={`w-5 h-5 text-on-surface-variant shrink-0 transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openFaq === index ? "max-h-96 opacity-100 mb-6" : "max-h-0 opacity-0"}`}>
                      <p className="text-on-surface-variant font-sans text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="w-full text-center bg-surface-container border border-white/10 p-12 rounded-3xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent -z-10" />
              <h2 className="hero-display text-3xl md:text-4xl font-bold text-white mb-4">Ready to get started with {service.title}?</h2>
              <p className="text-on-surface-variant font-sans mb-8 max-w-md mx-auto">Book a free call. We'll walk you through exactly what we'd do for your brand.</p>
              <Link to="/contact" className="inline-block px-8 py-4 bg-white text-background font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-colors duration-300 rounded">
                Book a Free Strategy Call
              </Link>
            </div>

          </div>

          {/* RIGHT — sticky pricing + trust */}
          <div className="xl:col-span-5 xl:sticky xl:top-28 flex flex-col gap-4">

            {/* Trust signals */}
            <div className="flex flex-col gap-3 px-1">
              {[
                "First delivery within 3–5 business days",
                "Unlimited revisions until you're happy",
                "No contracts — cancel or pause anytime",
                "14-day money-back guarantee",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-on-surface-variant font-sans">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Mini review */}
            <div className="bg-surface-container border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                ))}
                <span className="text-xs font-mono text-on-surface-variant ml-2">4.9 / 5</span>
              </div>
              <p className="text-sm text-on-surface-variant font-sans leading-relaxed italic">
                "First batch came in 4 days and the quality was there from day one. Didn't expect results this fast."
              </p>
              <div className="mt-3 text-xs font-mono uppercase tracking-widest text-white font-bold">— Sarah K., E-Commerce Brand</div>
            </div>

            {/* Pricing card */}
            <div className="bg-surface-container border border-white/10 rounded-3xl p-8 shadow-2xl">
              {service.popular && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest font-mono mb-4">
                  Popular Choice
                </div>
              )}

              <h3 className="hero-display text-xl font-bold text-white mb-1">Configure Your Plan</h3>
              <p className="text-xs text-on-surface-variant font-sans mb-6">Slide to select your monthly volume.</p>

              <div className="bg-background/60 border border-white/5 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold mb-1">Volume</div>
                    <div className="hero-display font-bold text-xl text-white">{currentStepInfo.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-bold mb-1">Price</div>
                    <div className="flex items-baseline gap-1">
                      <span className="hero-display font-bold text-4xl text-white">${currentStepInfo.price}</span>
                      <span className="text-sm text-on-surface-variant">/mo</span>
                    </div>
                  </div>
                </div>

                {maxStep > 0 && (
                  <>
                    <input
                      type="range"
                      min={0}
                      max={maxStep}
                      step={1}
                      value={activeStep}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setActiveStep(val);
                        const pct = (val / maxStep) * 100;
                        e.currentTarget.style.background = `linear-gradient(to right, var(--color-primary, #a78bfa) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
                      }}
                      className="w-full cursor-pointer"
                      style={{ background: "linear-gradient(to right, var(--color-primary, #a78bfa) 0%, rgba(255,255,255,0.1) 0%)" }}
                    />
                    <div className="flex justify-between mt-2">
                      <span className="font-mono text-[10px] text-on-surface-variant">{service.sliderSteps[0].label}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant">{service.sliderSteps[maxStep].label}</span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-white text-background font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-colors duration-300 rounded-xl flex items-center justify-center gap-2 mb-3"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>

              <Link
                to="/contact"
                className="w-full block text-center py-3 bg-transparent border border-white/10 text-white font-mono text-xs font-bold uppercase tracking-widest hover:border-white/30 transition-colors rounded-xl"
              >
                Book a Strategy Call
              </Link>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-on-surface-variant font-sans">
                <ShieldCheck className="w-4 h-4 text-primary/70" />
                Flat-rate · No hidden fees · Cancel anytime
              </div>
            </div>

            {/* Recent Work Showcase */}
            <div className="bg-surface-container border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">

               <h3 className="hero-display text-lg font-bold text-white mb-1">Recent Showcase</h3>
               <p className="text-xs text-on-surface-variant font-sans mb-5">A sample of recent deliverables from this service.</p>
               
               <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)] group/marquee -mx-2 px-2">
                 <div className="marquee-track gap-5 group-hover/marquee:[animation-play-state:paused] py-1" style={{ animationDuration: '40s' }}>
                   {['https://streamable.com/a69bm3', 'https://streamable.com/30ffri', 'https://streamable.com/e25yp1', 'https://streamable.com/e3xzs4', 'https://streamable.com/a69bm3', 'https://streamable.com/30ffri', 'https://streamable.com/e25yp1', 'https://streamable.com/e3xzs4'].map((url, idx) => (
                      <div key={idx} className="w-56 sm:w-64 aspect-[9/16] rounded-2xl overflow-hidden bg-background/50 border border-white/5 relative group cursor-pointer flex-shrink-0 shadow-lg">
                         <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-80 pointer-events-none z-10" />
                         
                         <div className="absolute inset-0 z-0">
                           <CustomPlayer url={url} playing={false} muted={true} loop={true} />
                         </div>

                         <div className="absolute bottom-4 left-4 text-xs font-bold text-[#fff] z-20 pointer-events-none text-shadow-sm">
                            High-Converting Creative
                         </div>
                      </div>
                   ))}
                 </div>
               </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
