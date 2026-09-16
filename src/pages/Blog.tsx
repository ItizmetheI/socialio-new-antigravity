import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const posts = [
  {
    id: 1,
    title: "Why Your CAC is Rising (And How to Fix It)",
    excerpt: "A deep dive into the macroeconomic shifts affecting paid acquisition and 3 frameworks to build resilience into your ad accounts.",
    category: "Paid Acquisition",
    date: "Oct 12, 2023",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    title: "The Zero-Click Content Strategy for LinkedIn",
    excerpt: "Stop trying to pull people off platform. Learn how to optimize for in-feed consumption that drives high-intent inbound leads.",
    category: "Content Marketing",
    date: "Oct 05, 2023",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    title: "Pricing Architecture: Creating Logical Upsell Paths",
    excerpt: "How to restructure your pricing tiers to naturally push users to higher LTV plans without relying on aggressive sales tactics.",
    category: "Product Led Growth",
    date: "Sep 28, 2023",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 4,
    title: "Deconstructing the Modern B2B Landing Page",
    excerpt: "We analyzed 100 top-performing B2B SaaS landing pages. Here are the 5 common elements they all share.",
    category: "CRO",
    date: "Sep 15, 2023",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 5,
    title: "Stop Using Attribution Models (Do This Instead)",
    excerpt: "Software attribution is fundamentally broken. Why you need to move to Marketing Mix Modeling and qualitative feedback.",
    category: "Analytics",
    date: "Sep 02, 2023",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 6,
    title: "Onboarding Tear-Down: Notion vs Airtable",
    excerpt: "A step-by-step analysis of how two PLG giants activate new users and the lessons you can apply to your SaaS.",
    category: "Product Led Growth",
    date: "Aug 20, 2023",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  }
];

export default function Blog() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    const { error: insertError } = await supabase.from("newsletter_signups").insert({ email });
    setIsSubmitting(false);
    if (insertError && insertError.code !== "23505") {
      setError("Something went wrong. Try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="pt-32 pb-24 relative min-h-screen">
      <div className="max-w-container-max mx-auto px-margin-desktop relative z-10 flex flex-col items-center">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-20 self-start text-left"
        >
          <h1 className="hero-display font-bold text-5xl md:text-6xl mb-6 text-white tracking-tight text-balance">
            The <span className="italic text-primary">Growth Log</span>.
          </h1>
          <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed">
            No fluff. Just tactical teardowns, frameworks, and actionable essays on how to scale revenue in tough markets.
          </p>
        </motion.div>

        {/* Featured Post (First one) */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full mb-16"
        >
           <div className="bg-surface-container border border-white/10 rounded-[2rem] p-4 md:p-6 flex flex-col md:flex-row gap-8 items-center overflow-hidden">
             <div className="w-full md:w-1/2 aspect-[16/10] rounded-2xl overflow-hidden relative">
                <img src={posts[0].image} alt={posts[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
             </div>
             <div className="w-full md:w-1/2 p-4 md:p-8 flex flex-col justify-center">
                <div className="flex gap-4 items-center mb-4">
                  <span className="px-3 py-1 bg-surface-container rounded-full text-xs text-primary">{posts[0].category}</span>
                </div>
                <h2 className="hero-display text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-primary transition-colors pr-8">
                  {posts[0].title}
                </h2>
                <p className="text-base text-on-surface-variant mb-8 line-clamp-3">
                  {posts[0].excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant font-medium mt-auto">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {posts[0].date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {posts[0].readTime}</span>
                </div>
             </div>
           </div>
        </motion.div>

        {/* Grid Posts */}
        <div className="w-full grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.slice(1).map((post, index) => (
             <motion.div 
               key={post.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.5, delay: index * 0.1 }}
               className="bg-surface-container border border-white/10 rounded-[1.5rem] overflow-hidden flex flex-col"
             >
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-background/80 backdrop-blur-md rounded-full text-xs text-white font-medium border border-white/10">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                    {post.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-6 flex-grow line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                      <span>{post.date}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant/50" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>
             </motion.div>
          ))}
        </div>

        {/* Newsletter CTA */}
         <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 w-full max-w-4xl bg-surface-container border border-white/10 rounded-[2.5rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden"
        >

          
          <div className="flex-1 relative z-10 text-center md:text-left">
            <h3 className="hero-display text-2xl md:text-3xl font-bold text-white mb-4">Get the weekly playbook</h3>
            <p className="text-base text-on-surface-variant">Join 500+ founders and brand owners getting our best growth frameworks sent directly to their inbox every Tuesday.</p>
          </div>
          
          <div className="w-full md:w-auto flex-shrink-0 relative z-10">
            {submitted ? (
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> You're subscribed.
              </div>
            ) : (
              <>
                <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface-container/80 border border-outline-variant/30 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-primary min-w-[250px]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary-hover font-bold text-on-primary-fixed px-6 py-3 rounded-xl whitespace-nowrap transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                <p className="text-[11px] text-on-surface-variant mt-3 text-center sm:text-left">No spam. Unsubscribe anytime.</p>
              </>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
