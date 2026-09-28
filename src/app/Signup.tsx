import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";
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
    if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
      setError("Use at least 8 characters, with at least one letter and one number.");
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
        <div>
          <h1 className="hero-display font-bold text-3xl tracking-tight text-white mb-3">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="field-label">Password</label>
              <input id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-describedby="signup-password-hint"
                className="field"
              />
              <p id="signup-password-hint" className="text-xs text-on-surface-variant mt-1.5">At least 8 characters, with a letter and a number.</p>
            </div>

            {error && <div className="text-error text-sm" role="alert">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 mt-1"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
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
