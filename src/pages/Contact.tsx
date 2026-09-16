import { motion } from "motion/react";
import { Mail, Clock, Globe, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import { servicesData } from "../data/services";
import { supabase } from "../lib/supabase";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    budget: "",
    message: ""
  });

  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError("Please fill out your name, email, and message.");
      return;
    }
    setError("");
    setStatus("submitting");
    const { error: submitError } = await supabase.from("contact_submissions").insert({
      name: formData.name,
      email: formData.email,
      company: formData.company || null,
      service: formData.service || null,
      budget: formData.budget || null,
      message: formData.message,
    });
    if (submitError) {
      setStatus("idle");
      setError("Something went wrong sending your message. Please try again.");
      return;
    }
    setStatus("success");
  };

  return (
    <div className="pt-32 pb-24 relative overflow-hidden min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-start">
        
        {/* Left Column: Info */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-10 lg:sticky lg:top-32"
        >
          <div>
            <h1 className="hero-display text-5xl md:text-6xl tracking-tighter mb-6 text-white font-bold">
              Let's talk growth.
            </h1>
            <p className="font-sans text-xl text-on-surface-variant max-w-md leading-relaxed">
              Book a free 30-minute strategy call. We'll audit your current content setup and show you exactly what we'd do differently.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <a href="mailto:support@socialio.io" className="font-sans text-lg font-bold text-white hover:text-primary transition-colors">support@socialio.io</a>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-sans text-lg text-white">Response within 24 hours</span>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-white/5">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-sans text-lg text-white">Remote-first. We work with brands globally.</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border border-white/10 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl mt-4">
             <div className="border-b border-white/5 pb-6">
               <div className="hero-display text-4xl text-white font-bold mb-2">200+</div>
               <div className="font-mono text-xs uppercase tracking-widest text-primary">Brands Served</div>
             </div>
             <div className="border-b border-white/5 pb-6">
               <div className="hero-display text-4xl text-white font-bold mb-2">4.9<span className="text-primary ml-1">★</span></div>
               <div className="font-mono text-xs uppercase tracking-widest text-primary">Rating</div>
             </div>
             <div>
               <div className="hero-display text-4xl text-white font-bold mb-2">14-Day</div>
               <div className="font-mono text-xs uppercase tracking-widest text-primary">Guarantee</div>
             </div>
          </div>
        </motion.div>

        {/* Right Column: Form */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-surface-container border border-white/10 p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden"
        >
          {status === "success" ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-20"
            >
               <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                 <CheckCircle2 className="w-10 h-10 text-primary" />
               </div>
               <h3 className="hero-display text-3xl font-bold text-white mb-4">Message sent.</h3>
               <p className="font-sans text-on-surface-variant text-lg">We'll be in touch within 24 hours.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold focus-within:text-primary transition-colors">
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary font-sans transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold focus-within:text-primary transition-colors">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="john@company.com"
                    className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary font-sans transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold focus-within:text-primary transition-colors">
                  Company / Brand Name
                </label>
                <input 
                  type="text" 
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  placeholder="Acme Corp"
                  className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary font-sans transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold focus-within:text-primary transition-colors">
                    Service Interested In
                  </label>
                  <select 
                    value={formData.service}
                    onChange={e => setFormData({...formData, service: e.target.value})}
                    className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary font-sans transition-colors appearance-none"
                  >
                    <option value="" disabled>Select a service...</option>
                    {servicesData.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold focus-within:text-primary transition-colors">
                    Monthly Budget
                  </label>
                  <select 
                    value={formData.budget}
                    onChange={e => setFormData({...formData, budget: e.target.value})}
                    className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary font-sans transition-colors appearance-none"
                  >
                    <option value="" disabled>Select budget...</option>
                    <option value="Under $500">Under $500</option>
                    <option value="$500 – $1,000">$500 – $1,000</option>
                    <option value="$1,000 – $2,500">$1,000 – $2,500</option>
                    <option value="$2,500+">$2,500+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold focus-within:text-primary transition-colors">
                  Message <span className="text-primary">*</span>
                </label>
                <textarea 
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  placeholder="Tell us about your current growth bottlenecks..."
                  className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary font-sans transition-colors resize-none"
                ></textarea>
              </div>

              {error && (
                <div className="text-red-400 font-sans text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-4 mt-2 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(215,183,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Sending..." : "Send Message →"}
              </button>
            </form>
          )}
        </motion.div>

      </div>
    </div>
  );
}
