import { ShoppingBag, MonitorPlay, MapPin, Activity, UserSquare2, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

export default function Industries() {
  const industries = [
    { name: "SaaS & Tech", icon: MonitorPlay, tag: "Content + SEO focus", desc: "Content that educates and converts. Blog posts, LinkedIn content, and SEO strategies that compound MRR." },
    { name: "Health & Wellness", icon: Activity, tag: "Trust-first content", desc: "Trust-first content strategies. UGC and educational posts that build credibility before the ask." },
    { name: "E-Commerce", icon: ShoppingBag, tag: "UGC + Social Posts", desc: "We scale DTC brands with UGC, short-form video, and paid social that converts cold traffic profitably." },
    { name: "Real Estate", icon: MapPin, tag: "Local SEO + Social", desc: "Instagram growth, consistent social posts, and local SEO backlinks that put you on the map — literally." },
    { name: "Travel & Hospitality", icon: UserSquare2, tag: "Short-form + Instagram", desc: "Short-form video editing, Instagram growth, and content systems that turn followers into revenue." },
    { name: "Professional Services", icon: Layers, tag: "Blog + Backlinks", desc: "White-label content production. We work quietly in the background so you can focus on client relationships." },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto text-on-surface">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-20"
      >
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 tracking-tighter">Built for Your Industry</h1>
        <p className="font-sans text-xl text-on-surface-variant max-w-2xl mx-auto">
          We've driven results across verticals. Here's how we approach each one.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
        {industries.map((ind, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i % 3 * 0.1 }}
            className="bg-surface-container border border-white/10 p-8 rounded-3xl hover:-translate-y-1 transition-transform duration-300 group h-full flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                <ind.icon className="w-7 h-7" />
              </div>
              {ind.tag && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-1 rounded">
                  {ind.tag}
                </div>
              )}
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-4">{ind.name}</h3>
            <p className="font-sans text-on-surface-variant text-lg leading-relaxed">{ind.desc}</p>
          </motion.div>
        ))}
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-surface-container border border-white/10 rounded-3xl p-12 text-center"
      >
         <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">Don't see your industry?</h2>
         <p className="font-sans text-on-surface-variant text-lg max-w-xl mx-auto mb-8">
           We've worked with brands across 30+ niches.
         </p>
         <Link to="/contact" className="inline-block px-8 py-4 bg-white text-black font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-colors duration-300 rounded shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(215,183,255,0.3)]">
            Contact Us
         </Link>
      </motion.div>
    </div>
  )
}
