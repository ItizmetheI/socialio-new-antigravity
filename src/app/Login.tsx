import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import Logo from "../components/Logo";
import { useAuth } from "../lib/auth/AuthContext";
import AuthFeedPanel from "../components/AuthFeedPanel";

export default function Login() {
  const { session, profile, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !session || !profile) return;
    const home = profile.role === "client" ? "/app" : "/ops";
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  }, [isLoading, session, profile, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) setError(signInError);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AuthFeedPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center mb-10 lg:hidden">
            <Logo />
          </div>
          <div className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
            <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">
              Welcome <span className="italic text-primary">back.</span>
            </h1>
            <p className="text-on-surface-variant mb-8">
              Track proposals, requests, and deliverables in one place.
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Password
                  </label>
                  <Link to="/app/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
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
                {isSubmitting ? "Signing in..." : "Sign in →"}
              </button>
            </form>
          </div>

          <p className="text-center text-on-surface-variant text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link to="/app/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
