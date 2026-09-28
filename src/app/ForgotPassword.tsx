import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
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
    <AuthLayout>
        <div>
          {submitted ? (
            <>
              <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">Check your email.</h1>
              <p className="text-on-surface-variant break-words">
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
                  <label htmlFor="forgotpassword-email" className="field-label">Email</label>
                  <input id="forgotpassword-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="field"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3.5 mt-1"
                >
                  {isSubmitting ? "Sending..." : "Send reset link"}
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
    </AuthLayout>
  );
}
