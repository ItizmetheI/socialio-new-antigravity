import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../lib/auth/AuthContext";
import { useCart } from "../context/CartContext";

export default function Signup() {
  const { session, profile, isLoading, signUp } = useAuth();
  const { items } = useCart();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !session || !profile) return;
    navigate(items.length > 0 ? "/checkout" : profile.role === "client" ? "/app" : "/ops", { replace: true });
  }, [isLoading, session, profile, items.length, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError("Fill in every field.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    // If email confirmation is required, signUp() succeeds but no session is
    // created yet — the redirect effect above only fires once one exists.
    setAwaitingConfirmation(true);
  };

  if (awaitingConfirmation && !session) {
    return (
      <AuthLayout>
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
          <h1 className="hero-display font-bold text-2xl md:text-3xl tracking-tight text-white mb-3">
            Check your <span className="italic text-primary">email.</span>
          </h1>
          <p className="text-on-surface-variant">
            We sent a confirmation link to <span className="text-white font-bold">{email.trim()}</span>. Open it and
            you&apos;ll be signed straight in{items.length > 0 ? " and taken to checkout" : ""}.
          </p>
          <p className="text-sm text-on-surface-variant mt-4">Nothing after a few minutes? Check your spam folder.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
          <h1 className="hero-display font-bold text-2xl md:text-3xl tracking-tight mb-2 text-white">
            Create your <span className="italic text-primary">account.</span>
          </h1>
          <p className="text-on-surface-variant mb-8">
            {items.length > 0 ? "One step before checkout." : "Your pipeline, calendar, brand kit and results in one place."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                Full name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
              />
            </div>
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
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 mt-2 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating account..." : "Create account →"}
            </button>
          </form>
        </div>

        <p className="text-center text-on-surface-variant text-sm mt-8">
          Already have an account?{" "}
          <Link to="/app/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
    </AuthLayout>
  );
}
