import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Lock, ShieldCheck, RotateCcw, CreditCard } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../lib/auth/AuthContext";
import { supabase } from "../lib/supabase";
import NavBar from "../components/NavBar";
import ErrorBanner from "../components/ErrorBanner";
import Spinner from "../components/Spinner";
import { formatDollars } from "../lib/format";

const SUPPORT_EMAIL = "support@socialio.io";

const BUSY = `Checkout is busy right now. Please try again in a few seconds. If it keeps happening, email ${SUPPORT_EMAIL}.`;

// Cart and account problems (4xx) are worth showing as-is; a server, Stripe
// or network failure (5xx, or no response at all) only ever needs "try again".
export const friendlyCheckoutError = (message: string, status?: number) => {
  // The Edge Function answers this until the Stripe keys are configured.
  if (/missing required env vars/i.test(message)) {
    return `Online payments aren't switched on yet. Email ${SUPPORT_EMAIL} and we'll get you started today.`;
  }
  return status !== undefined && status < 500 ? message : BUSY;
};

const TRUST_POINTS = [
  { icon: Lock, title: "Paid on Stripe", body: "You pay on Stripe's secure checkout page. Your card details never touch our servers." },
  { icon: ShieldCheck, title: "Prices set server-side", body: "Every amount is checked against our price list on the server, so what you see is what you pay." },
  { icon: RotateCcw, title: "Money-back guarantee", body: "Not happy with your first batch? Tell us within 14 days of delivery for a full refund." },
];

export default function Checkout() {
  const { items } = useCart();
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
      // supabase-js puts the function's JSON error body on invokeError.context.
      let message = data?.error ?? invokeError?.message ?? "Couldn't start checkout. Try again.";
      const context = (invokeError as { context?: Response } | null)?.context;
      const status = context instanceof Response ? context.status : undefined;
      if (context && typeof context.json === "function") {
        try {
          message = ((await context.json()) as { error?: string }).error ?? message;
        } catch {
          // keep the generic message
        }
      }
      setIsRedirecting(false);
      setError(friendlyCheckoutError(message, status));
      return;
    }
    window.location.href = data.url;
  };

  if (items.length === 0) {
    return <Navigate to="/pricing" replace />;
  }

  const monthly = items.filter((i) => i.type === "service");
  const oneTime = items.filter((i) => i.type !== "service");
  const monthlyTotal = monthly.reduce((sum, i) => sum + i.price, 0);
  const dueToday = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-6xl mx-auto px-5 md:px-6 pt-28 md:pt-32 pb-20">
        <h1 className="hero-display font-bold text-3xl md:text-4xl text-white mb-2">Checkout</h1>
        <p className="text-on-surface-variant mb-10">Review your order, then pay securely on Stripe.</p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] gap-8 items-start">
          <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8">
            <h2 className="font-bold text-white mb-6">Your order</h2>
            {[
              { label: "Monthly services", rows: monthly, suffix: "/mo" },
              { label: "One-time add-ons", rows: oneTime, suffix: "" },
            ]
              .filter((group) => group.rows.length > 0)
              .map((group) => (
                <div key={group.label} className="mb-6 last:mb-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">{group.label}</div>
                  <ul className="divide-y divide-white/10">
                    {group.rows.map((item) => (
                      <li key={item.id} className="flex justify-between items-start gap-4 py-3">
                        <div>
                          <div className="text-white font-bold">{item.title}</div>
                          <div className="text-sm text-on-surface-variant">{item.levelLabel}</div>
                        </div>
                        <span className="text-white font-bold whitespace-nowrap">
                          {formatDollars(item.price)}
                          <span className="text-on-surface-variant font-normal text-sm">{group.suffix}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            <Link to="/pricing" className="inline-block mt-2 text-sm text-primary hover:underline">
              &larr; Change services
            </Link>
          </section>

          <aside className="lg:sticky lg:top-28 flex flex-col gap-4">
            <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-on-surface-variant">Due today</span>
                <span className="text-3xl font-black text-white">{formatDollars(dueToday)}</span>
              </div>
              {monthly.length > 0 && (
                <p className="text-sm text-on-surface-variant mb-6">
                  Then {formatDollars(monthlyTotal)}/month for your services. Change or cancel by email; it applies from your next billing cycle.
                </p>
              )}

              {error && (
                <div className="mb-4">
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
                  className="btn-primary w-full"
                >
                  <CreditCard className="w-4 h-4" />
                  {isRedirecting ? "Opening secure checkout..." : "Pay securely"}
                  {!isRedirecting && <ArrowRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-on-surface-variant text-center">Create an account (or sign in) so your order links to your dashboard.</p>
                  <Link to="/app/signup" className="btn-primary w-full">
                    Create account
                  </Link>
                  <Link to="/app/login" state={{ from: { pathname: "/checkout" } }} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors text-center rounded-xl">
                    Sign in
                  </Link>
                </div>
              )}
              <p className="text-xs text-on-surface-variant mt-4 text-center">
                By paying you agree to our{" "}
                <Link to="/terms" className="underline hover:text-white">Terms of Service</Link>, including automatic monthly renewal until you cancel,
                and our <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
              </p>
            </section>

            <ul className="bg-surface-container border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
              {TRUST_POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-white">{title}</div>
                    <div className="text-xs text-on-surface-variant leading-relaxed">{body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
