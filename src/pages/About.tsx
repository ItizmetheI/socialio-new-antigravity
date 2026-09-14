import { motion } from "motion/react";
import { Zap, ShieldCheck, BarChart3, Users, Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const values = [
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "Velocity Over Perfection",
    description: "We operate in sprints, not quarters. Growth requires testing, and testing requires speed. Your first batch of content is live within 7 days."
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-primary" />,
    title: "Radical Transparency",
    description: "Flat-rate pricing, no hidden fees, and a real-time Kanban board where you can track every deliverable, campaign, and metric 24/7."
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-primary" />,
    title: "Data-Driven Outcomes",
    description: "We hate vanity metrics. We track CAC, ROAS, and bottom-line revenue. If a strategy isn't performing, we pivot ruthlessly."
  }
];

const team = [
  {
    name: "Alex Rivera",
    role: "Lead Growth Engineer",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    bio: "Ex-Shopify growth lead. Obsessed with conversion funnels and technical SEO."
  },
  {
    name: "Jamie Chen",
    role: "Creative Director",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
    bio: "Award-winning designer with 10+ years shaping premium DTC brands and narratives."
  },
  {
    name: "Marcus Thorne",
    role: "Performance Marketing",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    bio: "Managed $50M+ in Meta/Google spend. Specializes in rapid creative testing."
  },
  {
    name: "Elena Rostova",
    role: "Content Strategist",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
    bio: "Master of organic algorithmic growth. Built multiple TikTok channels past 1M."
  }
];

export default function About() {
  return (
    <div className="pt-32 pb-24 relative overflow-hidden bg-background min-h-screen text-on-surface">

      
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center">
        
        {/* Section 1 - Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mb-24 pt-10"
        >
          <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full font-mono text-[10px] text-white/70 mb-8 uppercase tracking-widest font-bold">About Socialio</div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tighter mb-8 text-white font-bold leading-tight">
            The growth engineers <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">behind the scenes.</span>
          </h1>
          <p className="font-sans text-xl text-on-surface-variant max-w-3xl mx-auto leading-relaxed">
            We are an elite, productized growth team. Built for scale, engineered for precision, and utterly intolerant of bloated retainer models.
          </p>
        </motion.div>

        {/* Hero Image Spread */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full relative h-[400px] md:h-[500px] rounded-[2rem] overflow-hidden mb-32 border border-white/10"
        >
          <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&h=800&fit=crop" alt="Team collaborating" className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40 focus:mix-blend-normal" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-10 left-10 flex gap-6">
            <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex flex-col">
               <span className="font-display text-3xl font-bold text-white mb-1">HQ</span>
               <span className="font-mono text-xs text-primary uppercase tracking-widest">New York City</span>
            </div>
            <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex flex-col hidden sm:flex">
               <span className="font-display text-3xl font-bold text-white mb-1">Remote</span>
               <span className="font-mono text-xs text-primary uppercase tracking-widest">Global Talent</span>
            </div>
          </div>
        </motion.div>

        {/* Section 2 - Narrative */}
        <div className="w-full grid lg:grid-cols-2 gap-16 md:gap-24 mb-32 items-center">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">We killed the traditional agency model.</h2>
            <div className="space-y-6 font-sans text-on-surface-variant text-lg leading-relaxed">
              <p>
                We started Socialio out of pure frustration. Founders were paying massive retainers for "strategy documents" and endless scoping calls, but what they actually needed was execution. They needed videos to post, ads to launch, and copy to publish.
              </p>
              <p>
                Traditional agencies overpromise, underdeliver, and trap you in archaic 6-month contracts with no incentive to move fast. 
              </p>
              <p>
                We built the exact opposite: a flat-rate subscription service that plugs an elite design, content, and performance marketing team directly into your slack channel. Predictable output at a predictable cost—allowing you to treat marketing as scalable infrastructure.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-surface-container border border-white/5 p-8 rounded-[2rem] hover:border-primary/30 transition-colors flex flex-col justify-center items-center text-center translate-y-8 shadow-2xl">
                <Globe className="w-8 h-8 text-white mb-4" />
                <div className="font-display text-4xl text-white font-bold mb-2">12</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Countries Served</div>
             </div>
             <div className="bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center shadow-2xl">
                <Users className="w-8 h-8 text-primary mb-4" />
                <div className="font-display text-4xl text-white font-bold mb-2">200+</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Happy Brands</div>
             </div>
             <div className="col-span-2 bg-surface-container border border-white/5 p-8 rounded-[2rem] hover:border-white/20 transition-colors flex items-center justify-between shadow-2xl mt-4">
                <div>
                  <div className="font-display text-4xl text-white font-bold mb-1">$50M+</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Ad Spend Managed</div>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin flex items-center justify-center">
                   <div className="w-12 h-12 rounded-full border-2 border-white/20" />
                </div>
             </div>
          </div>
        </div>

        {/* Section 3 - Core Values */}
        <div className="w-full mb-40">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Our Operating System</h2>
            <p className="text-on-surface-variant font-sans text-lg max-w-2xl mx-auto">The principles that dictate how we hire, build, and scale your brand.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface-container/50 border border-white/5 p-10 rounded-3xl hover:border-white/20 hover:bg-surface-container transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10">
                  {value.icon}
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-4">{value.title}</h3>
                <p className="font-sans text-on-surface-variant leading-relaxed text-sm">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Section 4 - Team */}
        <div className="w-full mb-32">
           <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
             <div>
               <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">The Architects</h2>
               <p className="text-on-surface-variant font-sans text-lg max-w-xl">
                 Senior talent only. We don't bait-and-switch you by selling with an executive and delivering with a junior intern.
               </p>
             </div>
             <Link to="/contact" className="hidden md:flex bg-white/5 hover:bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-sans font-bold text-sm items-center gap-2 transition-colors">
               Join the team <ArrowRight className="w-4 h-4" />
             </Link>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, i) => (
                <motion.div 
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <div className="relative aspect-[3/4] mb-6 overflow-hidden rounded-2xl bg-surface-container">
                     <img 
                       src={member.image} 
                       alt={member.name} 
                       className="w-full h-full object-cover grayscale mix-blend-luminosity group-hover:grayscale-0 group-hover:mix-blend-normal transition-all duration-700 group-hover:scale-105"
                     />
                     <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{member.name}</h3>
                  <div className="font-mono text-xs text-on-surface-variant uppercase tracking-widest mb-3">{member.role}</div>
                  <p className="font-sans text-sm text-on-surface-variant/80 border-l border-white/10 pl-3">
                    {member.bio}
                  </p>
                </motion.div>
              ))}
           </div>
        </div>

        {/* Section 5 - CTA */}
        <div className="w-full max-w-5xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="relative bg-surface-container border border-white/10 p-12 md:p-20 rounded-[3rem] text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-8 relative z-10">Stop managing freelancers. <br />Start scaling.</h2>
            <p className="font-sans text-on-surface-variant text-lg max-w-xl mx-auto mb-10 relative z-10">
              One subscription. One dedicated team. Boundless growth. Hop on a 15-minute discovery call to explore the model.
            </p>
            <Link to="/contact" className="relative z-10 inline-flex px-8 py-5 bg-white text-black font-mono text-sm font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-300 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(215,183,255,0.4)] hover:-translate-y-1 items-center gap-3">
              Book Your Strategy Session <Zap className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
