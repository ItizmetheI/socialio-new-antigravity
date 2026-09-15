import { Link } from "react-router-dom";
import { motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, BarChart3, Fingerprint, Terminal, Maximize2 } from "lucide-react";
import Magnetic from "./Magnetic";

export default function AnalyticsShowcase() {
  return (
    <section className="min-h-screen bg-background text-on-surface py-32 px-6 relative overflow-hidden flex flex-col items-center border-t border-white/5">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px] z-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[150px] rounded-[100%] pointer-events-none mix-blend-screen" />

      <div className="max-w-6xl mx-auto relative z-10 w-full flex flex-col items-center">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-end mb-24 border-b border-white/5 pb-12 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="hero-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
              From fleeting views <br className="hidden md:block" />
              to <span className="italic text-primary">compounded retention.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start md:items-end"
          >
            <p className="text-[clamp(0.875rem,2vw,1rem)] text-on-surface-variant max-w-xs text-left md:text-right text-balance mb-6">
              Our architecture turns passive scrolling into active, measurable participation loops.
            </p>
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

        <div className="w-full grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-2 bg-surface-container border border-white/10 rounded-3xl p-8 relative overflow-hidden group flex flex-col"
          >
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h3 className="text-sm uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                  Session Duration Multiplier
                </h3>
                <div className="flex items-end gap-3">
                  <div className="hero-display text-6xl font-bold text-white leading-none">3.4x</div>
                  <div className="text-sm text-primary font-bold mb-1">+124% vs standard</div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-background border border-white/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-on-surface-variant" />
              </div>
            </div>

            <div className="w-full h-48 relative mt-auto z-10">
              <AnimatedChart />
            </div>

            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 flex items-center justify-center p-8">
              <div className="w-full h-full bg-surface-container border border-white/10 rounded-xl p-6 font-mono text-xs text-on-surface-variant overflow-hidden relative">
                <div className="absolute top-4 right-4">
                  <Terminal className="w-4 h-4 text-on-surface-variant" />
                </div>
                <div className="text-primary">GET /api/v1/retention/metrics</div>
                <div className="mt-2 text-white/80">{"{"}</div>
                <div className="ml-4 text-on-surface-variant">"org_id": "northwind-coffee",</div>
                <div className="ml-4 text-on-surface-variant">"requests_delivered": 41,</div>
                <div className="ml-4 text-on-surface-variant">"avg_session_lift": [</div>
                <div className="ml-8 text-white/50">"3.4x", "week_over_week", "+124%"</div>
                <div className="ml-4 text-on-surface-variant">]</div>
                <div className="text-white/80">{"}"}</div>
                <div className="mt-4 text-emerald-400">200 OK</div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-6">
            <MetricCard
              icon={<Fingerprint />}
              title="Audience Reach"
              value="89%"
              sub="Total cross-platform brand impressions"
              delay={0.2}
            />

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex-1 bg-surface-container border border-primary/20 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_20px_40px_-15px_rgba(221,183,255,0.15)] transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

              <div className="flex justify-between items-start mb-8 relative z-10">
                <h3 className="text-xs uppercase tracking-widest font-bold text-primary">Content Velocity</h3>
                <Maximize2 className="w-4 h-4 text-primary" />
              </div>

              <div className="relative z-10">
                <div className="hero-display text-3xl font-bold text-white mb-6">Post Frequency</div>
                <DraggableSlider />
                <div className="text-xs text-on-surface-variant mt-6">Drag to adjust content output</div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mt-6 bg-surface-container border border-white/10 rounded-2xl p-4 flex items-center justify-between overflow-hidden"
        >
          <div className="flex items-center gap-3 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-mono text-on-surface-variant">WS_CONNECTED // LIVE_EVENTS</span>
          </div>
          <LiveTicker />
        </motion.div>
      </div>
    </section>
  );
}

function DraggableSlider() {
  const [value, setValue] = useState(75);
  const dragX = useMotionValue(0);

  useEffect(() => {
    return dragX.on("change", (v) => {
      const percentage = Math.max(0, Math.min(100, (v / 200) * 100));
      setValue(Math.round(percentage));
    });
  }, [dragX]);

  return (
    <div className="w-full relative py-4">
      <div className="w-[200px] h-1.5 bg-white/10 rounded-full relative">
        <motion.div style={{ width: `${value}%` }} className="absolute top-0 left-0 h-full bg-primary rounded-full" />
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 200 }}
          dragElastic={0}
          dragMomentum={false}
          style={{ x: dragX }}
          className="absolute top-1/2 -mt-3 -ml-3 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
        >
          <div className="w-2 h-2 rounded-full bg-primary" />
        </motion.div>
      </div>
      <div className="absolute top-10 right-8 text-2xl font-mono text-white/80">{value}%</div>
    </div>
  );
}

function LiveTicker() {
  const [events, setEvents] = useState<string[]>(["user_joined", "dwell_time_updated", "interaction_logged"]);

  useEffect(() => {
    const actions = ["like_received", "scroll_paused", "profile_view", "habit_loop_triggered", "dwell_time_+2s"];
    const interval = setInterval(() => {
      const newAction = actions[Math.floor(Math.random() * actions.length)];
      setEvents((prev) => [newAction, ...prev].slice(0, 3));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-6 text-xs font-mono text-on-surface-variant overflow-hidden w-2/3 justify-end">
      {events.map((ev, i) => (
        <motion.div
          key={ev + i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1 - i * 0.3, x: 0 }}
          className="whitespace-nowrap"
        >
          {ev}
        </motion.div>
      ))}
    </div>
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

function MetricCard({
  title,
  value,
  sub,
  delay,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  delay: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 rounded-3xl p-8 bg-surface-container border border-white/10 flex flex-col justify-between group hover:bg-white/5 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_20px_40px_-15px_rgba(221,183,255,0.1)] transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-8">
        <h3 className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">{title}</h3>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background border border-white/10 text-on-surface-variant group-hover:text-primary transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <div className="hero-display text-4xl font-bold mb-2 text-white">{value}</div>
        <div className="text-sm text-on-surface-variant">{sub}</div>
      </div>
    </motion.div>
  );
}
