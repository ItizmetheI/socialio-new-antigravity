import { Link } from "react-router-dom";
import { servicesData } from "../data/services";
import React from "react";
import PricingCard from "../components/PricingCard";
import { motion } from "motion/react";

export default function Pricing() {
  return (
    <>
      <main className="pt-32 w-full">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto px-6 mb-24"
        >
            <h1 className="hero-display font-bold text-4xl md:text-6xl tracking-tight mb-6 text-white max-w-3xl text-balance">
              Build your <span className="italic text-primary">marketing engine.</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed">
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
