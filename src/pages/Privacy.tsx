import { motion } from "motion/react";

export default function Privacy() {
  return (
    <div className="pt-32 pb-24 relative min-h-screen">
      <div className="max-w-3xl mx-auto px-margin-desktop relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-display-xl font-display-xl mb-6 text-white pb-2">
            Privacy Policy
          </h1>
          <p className="text-on-surface-variant mb-12">Last updated: October 2023</p>

          <div className="space-y-8 text-on-surface/80">
            <section>
              <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
              <p className="mb-4">
                We collect information that you provide directly to us when using our services or contacting us. This may include your name, email address, company details, and any other information you choose to provide.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <p className="mb-4">
                We use the information we collect to operate our business, provide our services, communicate with you, and improve our offerings. We do not sell your personal data to third parties.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-4">3. Data Security</h2>
              <p className="mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-white mb-4">4. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy, please contact us at privacy@kbgrowth.com.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
