import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../lib/auth/AuthContext";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";

export default function Checkout() {
  const { items, total } = useCart();
  const { session, isLoading } = useAuth();
  const [error, setError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleContinueToPayment = async () => {
    setError("");
    setIsRedirecting(true);
    const { data, error: invokeError } = await supabase.functions.invoke<{ url?: string; error?: string }>(
      "create-checkout-session",
      { body: { items: items.map(({ serviceId, levelLabel, type }) => ({ serviceId, levelLabel, type })) } },
    );
    if (invokeError || !data?.url) {
      setIsRedirecting(false);
      setError(data?.error ?? invokeError?.message ?? "Couldn't start checkout. Try again.");
      return;
    }
    window.location.href = data.url;
  };

  if (items.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-32">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-10">
          <Logo />
        </div>
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
          <h1 className="hero-display font-bold text-3xl tracking-tight mb-8 text-white">Order summary</h1>

          <div className="space-y-4 mb-8">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <div className="text-white font-bold">{item.title}</div>
                  <div className="text-xs text-on-surface-variant">
                    {item.levelLabel} {item.type === "service" ? "/mo" : ""}
                  </div>
                </div>
                <span className="text-white font-black">${item.price}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-8">
            <span className="text-on-surface-variant">Estimated total</span>
            <span className="text-2xl font-black text-white">${total}</span>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorBanner message={error} />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : session ? (
            <button
              onClick={handleContinueToPayment}
              disabled={isRedirecting}
              className="w-full py-4 bg-white text-background hover:bg-primary hover:text-white font-sans text-sm font-bold transition-all flex justify-center items-center gap-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedirecting ? "Redirecting to payment..." : "Continue to payment"}
              {!isRedirecting && <ArrowRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-on-surface-variant text-center mb-1">Sign in or create an account to pay.</p>
              <Link
                to="/app/login"
                className="w-full py-4 bg-white text-background hover:bg-primary hover:text-white font-sans text-sm font-bold transition-all flex justify-center items-center gap-2 rounded-xl"
              >
                Sign in
              </Link>
              <Link
                to="/app/signup"
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-sans text-sm font-bold transition-all flex justify-center items-center gap-2 rounded-xl"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
