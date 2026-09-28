import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthContext";
import { useCart } from "../context/CartContext";
import AuthLayout from "../components/AuthLayout";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const { session, profile, isLoading, signIn } = useAuth();
  const { items } = useCart();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    <AuthLayout>
          <div>
            <h1 className="hero-display font-bold text-3xl tracking-tight mb-2 text-white">
              Welcome <span className="italic text-primary">back.</span>
            </h1>
            <p className="text-on-surface-variant mb-8">Sign in to see your pipeline, calendar and results.</p>

            <GoogleButton />
            <div className="flex items-center gap-3 my-6 text-xs text-on-surface-variant">
              <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label htmlFor="login-email" className="field-label">Email</label>
                <input id="login-email"
                  type="email"
                  autoComplete="email"
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
                <input id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field"
                />
              </div>

              {error && <div className="text-error text-sm" role="alert">{error}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3.5 mt-1"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
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
