import { Link } from "react-router-dom";
import { servicesData } from "../data/services";
import React from "react";
import PricingCard from "../components/PricingCard";
import { BadgeCheck } from "lucide-react";
import { motion } from "motion/react";

export default function Pricing() {
  return (
    <>
      <div className="mesh-gradient-pricing fixed top-0 left-0 w-full h-full -z-10"></div>
      
      <main className="pt-32 w-full">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto px-6 text-center mb-24"
        >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary font-mono text-xs uppercase tracking-widest font-bold mb-8 shadow-inner shadow-primary/20">
                <BadgeCheck className="w-4 h-4" /> Transparent Flat-Rate Economics
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter mb-8 text-white max-w-4xl mx-auto">
              Build your <span className="font-bold text-white">marketing engine.</span>
            </h1>
            <p className="font-sans text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                No retainers. No generic agency fluff. Select a service to configure your volume and see precise flat-rate pricing.
            </p>
        </motion.section>

        {/* Dynamic Pricing Grid */}
        <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {servicesData.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index % 3 * 0.1 }}
              >
                <PricingCard service={service} />
              </motion.div>
            ))}
        </section>
      </main>
    </>
  );
}
