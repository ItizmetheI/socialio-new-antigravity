import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import Magnetic from "./Magnetic";

// One real idea, done well: our content model beats the standard one by
// 3.4x, shown as one honest chart — not a dashboard-mockup kitchen sink of
// fake JSON responses, fake live tickers, and toy sliders that don't map to
// anything real. Those all got cut; see git history if any of it is wanted
// back deliberately rather than as filler.
export default function AnalyticsShowcase() {
  return (
    <section className="py-32 px-6 relative overflow-hidden bg-background text-on-surface border-t border-white/5">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[150px] rounded-[100%] pointer-events-none mix-blend-screen" />

      <div className="max-w-5xl mx-auto relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 max-w-2xl"
        >
          <h2 className="hero-display text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-[1.1] text-white">
            From fleeting views <br className="hidden md:block" />
            to <span className="italic text-primary">compounded retention.</span>
          </h2>
          <p className="text-lg text-on-surface-variant max-w-lg mt-6 leading-relaxed">
            Our architecture turns passive scrolling into active, measurable participation loops — and it beats the standard content model by 3.4x.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <h3 className="text-sm uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                Session Duration Multiplier
              </h3>
              <div className="hero-display text-6xl font-bold text-white leading-none">3.4x</div>
            </div>
            <div className="text-sm text-primary font-bold">+124% vs. standard content model</div>
          </div>
          <div className="w-full h-56">
            <AnimatedChart />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Magnetic strength={0.15}>
            <Link
              to="/case-studies"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface-container border border-white/10 rounded-full hover:bg-white/5 transition-colors text-white"
            >
              <span className="text-xs font-bold uppercase tracking-widest">See the case studies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedChart() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className="w-full h-full">
      <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <line x1="0" y1="150" x2="400" y2="150" stroke="#ffffff1a" strokeWidth="1" />
        <line x1="0" y1="75" x2="400" y2="75" stroke="#ffffff1a" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="0" x2="400" y2="0" stroke="#ffffff1a" strokeWidth="1" strokeDasharray="4 4" />

        <motion.path
          d="M 0 130 C 100 120, 200 125, 400 110"
          fill="none"
          stroke="#5c5c60"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <motion.path
          d="M 0 130 C 50 110, 150 40, 250 30 S 350 10, 400 5"
          fill="none"
          stroke="#ddb7ff"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />

        <motion.path
          d="M 0 130 C 50 110, 150 40, 250 30 S 350 10, 400 5 L 400 150 L 0 150 Z"
          fill="url(#chart-gradient)"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 1 }}
        />

        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ddb7ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ddb7ff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
