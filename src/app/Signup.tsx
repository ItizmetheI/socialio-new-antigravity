import React, { useState, useEffect } from "react";
import PasswordInput from "../components/PasswordInput";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";
import Spinner from "../components/Spinner";
import { useAuth } from "../lib/auth/AuthContext";
import { useCart } from "../context/CartContext";
import { PASSWORD_RULE, passwordProblem } from "../lib/auth/password";

export default function Signup() {
  const { session, profile, isLoading, signUp, resendConfirmation } = useAuth();
  const { items } = useCart();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [resendState, setResendState] = useState<{ cooldown: number; message: string }>({ cooldown: 0, message: "" });
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
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setIsSubmitting(true);
    const { error: signUpError, alreadyRegistered: exists } = await signUp(email, password, fullName);
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    if (exists) {
      setAlreadyRegistered(true);
      return;
    }
    // If email confirmation is required, signUp() succeeds but no session is
    // created yet — the redirect effect above only fires once one exists.
    setAwaitingConfirmation(true);
  };

  useEffect(() => {
    if (resendState.cooldown <= 0) return;
    const timer = setTimeout(() => setResendState((r) => ({ ...r, cooldown: r.cooldown - 1 })), 1000);
    return () => clearTimeout(timer);
  }, [resendState.cooldown]);

  const handleResend = async () => {
    const { error: resendError } = await resendConfirmation(email);
    setResendState({
      cooldown: 60,
      message: resendError ? resendError : "Sent again. It can take a minute to arrive.",
    });
  };

  // Already signed in — the redirect effect is about to fire.
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

  if (alreadyRegistered) {
    return (
      <AuthLayout>
        <div>
          <h1 className="hero-display font-bold text-3xl tracking-tight text-white mb-3">
            You already have an <span className="italic text-primary">account.</span>
          </h1>
          <p className="text-on-surface-variant mb-8">
            <span className="text-white font-bold break-all">{email.trim()}</span> is already signed up, so we didn&apos;t send a new
            confirmation email. Sign in, or reset your password if you&apos;ve forgotten it.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/app/login" className="btn-primary w-full py-3.5">Sign in</Link>
            <Link to="/app/forgot-password" className="btn-secondary w-full py-3.5">Reset password</Link>
            <button type="button" onClick={() => setAlreadyRegistered(false)} className="text-sm text-on-surface-variant hover:text-white mt-2">
              Use a different email
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (awaitingConfirmation && !session) {
    return (
      <AuthLayout>
        <div>
          <h1 className="hero-display font-bold text-3xl tracking-tight text-white mb-3">
            Check your <span className="italic text-primary">email.</span>
          </h1>
          <p className="text-on-surface-variant">
            We sent a confirmation link to <span className="text-white font-bold">{email.trim()}</span>. Open it and
            you&apos;ll be signed straight in{items.length > 0 ? " and taken to checkout" : ""}.
          </p>
          <p className="text-sm text-on-surface-variant mt-4">Nothing after a few minutes? Check your spam folder, or send it again.</p>
          <button type="button" onClick={handleResend} disabled={resendState.cooldown > 0} className="btn-secondary w-full py-3.5 mt-6">
            {resendState.cooldown > 0 ? `Resend email (${resendState.cooldown}s)` : "Resend email"}
          </button>
          {resendState.message && <p className="text-xs text-on-surface-variant mt-2 text-center" role="status">{resendState.message}</p>}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
        <div>
          <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">
            Create your <span className="italic text-primary">account.</span>
          </h1>
          <p className="text-on-surface-variant mb-8">
            {items.length > 0 ? "One step before checkout." : "Content that stops the scroll, made for your brand."}
          </p>

          <GoogleButton label="Sign up with Google" />
          <div className="flex items-center gap-3 my-6 text-xs text-on-surface-variant">
            <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="signup-full-name" className="field-label">Full name</label>
              <input id="signup-full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="field-label">Email</label>
              <input id="signup-email"
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
              <label htmlFor="signup-password" className="field-label">Password</label>
              <PasswordInput id="signup-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-describedby="signup-password-hint"
              />
              <p id="signup-password-hint" className="text-xs text-on-surface-variant mt-1.5">{PASSWORD_RULE}</p>
            </div>

            {error && <div className="text-error text-sm" role="alert">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 mt-1"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
            <p className="text-xs text-on-surface-variant text-center -mt-1">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="underline hover:text-white">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
            </p>
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
