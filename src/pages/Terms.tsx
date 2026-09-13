import { motion } from "motion/react";

export default function Terms() {
  return (
    <div className="pt-32 pb-24 relative min-h-screen">
      <div className="max-w-3xl mx-auto px-margin-desktop relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-display-xl font-display-xl mb-6 text-white pb-2">
            Terms of Service
          </h1>
          <p className="text-on-surface-variant mb-12">Last updated: October 2023</p>

          <div className="space-y-8 text-on-surface/80">
            <section>
              <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing or using Socialio's website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-4">2. Services Provided</h2>
              <p className="mb-4">
                Socialio provides growth marketing, SEO, and consulting services. The specific deliverables and scope of work will be outlined in a separate Statement of Work (SOW) or contract agreed upon by both parties.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-4">3. Client Responsibilities</h2>
              <p className="mb-4">
                Clients are expected to provide timely feedback, necessary access to platforms, and accurate information to facilitate the successful execution of our services.
              </p>
            </section>

             <section>
              <h2 className="text-xl font-bold text-white mb-4">4. Limitation of Liability</h2>
              <p className="mb-4">
                Socialio shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-4">5. Contact Information</h2>
              <p className="mb-4">
                For any questions regarding these Terms, please contact us at support@socialio.io.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
