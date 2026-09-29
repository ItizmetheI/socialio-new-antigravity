import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthContext";
import { useCart } from "../context/CartContext";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";
import PasswordInput from "../components/PasswordInput";
import Spinner from "../components/Spinner";
import { lockoutSeconds } from "../lib/auth/lockout";

export default function Login() {
  const { session, profile, isLoading, signIn, resendConfirmation } = useAuth();
  const { items } = useCart();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [resendNote, setResendNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !session || !profile) return;
    // Signed in to finish buying: go straight back to checkout.
    if (profile.role === "client" && items.length > 0) {
      navigate("/checkout", { replace: true });
      return;
    }
    const home = profile.role === "client" ? "/app" : "/ops";
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    navigate(from && from.startsWith(home) ? from : home, { replace: true });
  }, [isLoading, session, profile, items.length, location.state, navigate]);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const timer = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockedFor]);

  // Already signed in (or just signed in) — the effect above is about to
  // redirect, so don't flash the form in the meantime.
  if (isLoading || (session && profile)) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 py-16 text-on-surface-variant" role="status">
          <Spinner />
          <p className="text-sm">{session ? "Signing you in…" : "Loading…"}</p>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedFor > 0 || isSubmitting) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setIsUnconfirmed(false);
    setResendNote("");
    setIsSubmitting(true);
    const { error: signInError, code } = await signIn(email, password);
    if (!signInError) return; // stay on "Signing in…" until the redirect
    setIsSubmitting(false);
    setError(signInError);
    if (code === "email_not_confirmed") {
      setIsUnconfirmed(true);
      return;
    }
    const next = failures + 1;
    setFailures(next);
    const wait = lockoutSeconds(next);
    if (wait > 0) {
      setLockedFor(wait);
      setError(`Too many tries. Wait ${wait} seconds, or reset your password.`);
    }
  };

  const handleResend = async () => {
    const { error: resendError } = await resendConfirmation(email);
    setResendNote(resendError ?? "Sent. Open the link in that email, then sign in.");
  };

  return (
    <AuthLayout>
      <div>
        <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">
          Welcome <span className="italic text-primary">back.</span>
        </h1>
        <p className="text-on-surface-variant mb-8">Sign in to your Socialio account.</p>

        <GoogleButton />
        <div className="flex items-center gap-3 my-6 text-xs text-on-surface-variant">
          <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="login-email" className="field-label">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="field"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="field-label mb-0">Password</label>
              <Link to="/app/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-error text-sm" role="alert">
              {error}
              {isUnconfirmed && (
                <button type="button" onClick={handleResend} className="block mt-1.5 text-primary font-bold hover:underline">
                  Send the confirmation email again
                </button>
              )}
            </div>
          )}
          {resendNote && <p className="text-xs text-on-surface-variant -mt-3" role="status">{resendNote}</p>}

          <button type="submit" disabled={isSubmitting || lockedFor > 0} className="btn-primary w-full py-3.5 mt-1">
            {isSubmitting ? "Signing in…" : lockedFor > 0 ? `Try again in ${lockedFor}s` : "Sign in"}
          </button>
        </form>
      </div>

      <p className="text-center text-on-surface-variant text-sm mt-8">
        Don&apos;t have an account?{" "}
        <Link to="/app/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
