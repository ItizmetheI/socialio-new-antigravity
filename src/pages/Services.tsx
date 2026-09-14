import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Target,
  MessageCircle,
  Tag,
  PenTool,
  MonitorPlay,
  Video,
  Search,
  Link as LinkIcon,
  Instagram
} from "lucide-react";
import { servicesData } from "../data/services";
import { motion } from "motion/react";

const iconMap: Record<string, any> = {
  "social-media-posts": { icon: <PenTool className="w-6 h-6" />, bg: "bg-blue-500/10", text: "text-blue-500" },
  "short-form-videos": { icon: <MonitorPlay className="w-6 h-6" />, bg: "bg-purple-500/10", text: "text-purple-500" },
  "instagram-growth": { icon: <Instagram className="w-6 h-6" />, bg: "bg-pink-500/10", text: "text-pink-500" },
  "ugc-content": { icon: <Video className="w-6 h-6" />, bg: "bg-orange-500/10", text: "text-orange-500" },
  "seo-blog-posts": { icon: <Search className="w-6 h-6" />, bg: "bg-emerald-500/10", text: "text-emerald-500" },
  "seo-backlinks": { icon: <LinkIcon className="w-6 h-6" />, bg: "bg-teal-500/10", text: "text-teal-500" },
};

export default function Services() {
  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30 text-surface-container-highest">
      
      {/* Background visual elements */}
      <div className="absolute top-0 inset-x-0 h-[600px] overflow-hidden -z-10 pointer-events-none">

      </div>

      <main className="pt-32 max-w-7xl mx-auto px-6 mb-24 relative z-10 text-on-surface">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16 md:mb-24 max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ff6b4a]" /> Simple, transparent pricing
          </span>
          <h1 className="hero-display font-bold text-5xl md:text-6xl tracking-tight mb-6 text-white text-balance">
            Everything you need to grow, <span className="italic text-primary">productized.</span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed max-w-xl">
            Pick the services you need, choose your volume, and we'll handle the rest. Dedicated teams, high-quality deliverables, and zero long-term contracts.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {servicesData.map((service, i) => {
             const styling = iconMap[service.id] || { icon: <Tag className="w-6 h-6" />, bg: "bg-gray-500/10", text: "text-gray-500" };
             
             return (
               <motion.div
                 key={service.id}
                 initial={{ opacity: 0, y: 30, scale: 0.95 }}
                 whileInView={{ opacity: 1, y: 0, scale: 1 }}
                 viewport={{ once: true, margin: "-50px" }}
                 transition={{ duration: 0.5, delay: i % 2 * 0.1 }}
               >
                 <Link 
                   to={`/service/${service.id}`} 
                   className="group flex flex-col h-full bg-surface-container border border-white/5 rounded-3xl p-8 hover:bg-surface-container-high hover:border-white/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
                 >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-6">
                       <div className="flex gap-5">
                         <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center transition-colors ${styling.bg} ${styling.text} group-hover:scale-110 duration-300`}>
                            {styling.icon}
                         </div>
                         <div>
                           <div className="font-mono text-[10px] text-primary uppercase tracking-widest font-bold mb-1">{service.category}</div>
                           <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">{service.title}</h3>
                           <div className="flex items-baseline gap-1">
                              <span className="text-on-surface-variant font-medium text-xs">Starts at</span>
                              <span className="font-sans text-2xl font-black tracking-tight text-white">${service.sliderSteps[0].price}</span>
                              <span className="text-on-surface-variant font-medium font-sans text-xs">/mo</span>
                           </div>
                         </div>
                       </div>
                    </div>
                    
                    <p className="font-sans text-base text-on-surface-variant leading-relaxed flex-grow">
                      {service.description} {service.longDescription}
                    </p>
  
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-8 mb-8 pb-8 border-b border-white/5">
                      {service.features.slice(0, 4).map((feature, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-1 ${styling.text}`} />
                          <span className="font-sans text-sm text-on-surface-variant transition-colors">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       {(service as any).proofs?.slice(0, 2).map((proof: any, idx: number) => (
                         <div key={idx} className="bg-background/50 rounded-xl p-4 border border-white/5">
                            <div className="text-2xl font-black text-white font-sans">{proof.value}</div>
                            <div className="text-xs text-on-surface-variant font-medium">{proof.label}</div>
                         </div>
                       ))}
                    </div>
  
                    <div className="mt-auto flex items-center justify-between text-on-surface-variant group-hover:text-primary transition-colors font-bold tracking-wide text-sm bg-white/5 p-4 rounded-xl border border-white/5 group-hover:bg-primary/10 group-hover:border-primary/20">
                       <span>Configure Plan Details</span>
                       <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                 </Link>
               </motion.div>
             )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24 p-10 md:p-14 border border-white/10 bg-surface-container rounded-3xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl"
        >

           <div className="relative z-10 max-w-xl">
             <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Not sure where to start?</h3>
             <p className="font-sans text-lg text-on-surface-variant leading-relaxed">Book a free discovery call with our growth team. We'll audit your current setup and recommend the exact services you need to hit your goals.</p>
           </div>
           
           <Link to="/contact" className="shrink-0 relative z-10 bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-xl flex items-center gap-3">
             <MessageCircle className="w-5 h-5" />
             <span>Book Discovery Call</span>
           </Link>
        </motion.div>

      </main>
    </div>
  );
}


