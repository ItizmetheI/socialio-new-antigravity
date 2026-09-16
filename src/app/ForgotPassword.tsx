import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import Logo from "../components/Logo";
import { useAuth } from "../lib/auth/AuthContext";

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    await resetPasswordForEmail(email);
    setIsSubmitting(false);
    // Always show the same message whether or not the email exists — no
    // account-enumeration leak via a differing response.
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-10">
          <Logo />
        </div>
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
          {submitted ? (
            <>
              <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">Check your email.</h1>
              <p className="text-on-surface-variant">
                If an account exists for {email}, we sent a link to reset the password.
              </p>
            </>
          ) : (
            <>
              <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">
                Reset your <span className="italic text-primary">password.</span>
              </h1>
              <p className="text-on-surface-variant mb-8">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 mt-2 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sending..." : "Send reset link →"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-8">
          <Link to="/app/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
