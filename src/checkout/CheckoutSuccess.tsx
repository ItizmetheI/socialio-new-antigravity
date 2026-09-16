import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import type { OrderStatus } from "../lib/database.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const [status, setStatus] = useState<OrderStatus | "timeout" | "not_found">("pending");
  const cartCleared = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus("not_found");
      return;
    }
    let isMounted = true;
    const startedAt = Date.now();

    const poll = async () => {
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("stripe_checkout_session_id", sessionId)
        .single();
      if (!isMounted) return;

      if (data?.status === "paid") {
        setStatus("paid");
        return;
      }
      if (!data) {
        setStatus("not_found");
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (status === "paid" && !cartCleared.current) {
      cartCleared.current = true;
      clearCart();
    }
  }, [status, clearCart]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-32 text-center">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Logo />
        </div>
        <div className="bg-surface-container border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
          {status === "pending" && (
            <>
              <div className="flex justify-center mb-6">
                <Spinner />
              </div>
              <h1 className="hero-display font-bold text-2xl text-white mb-2">Confirming your payment...</h1>
              <p className="text-on-surface-variant">This usually takes a few seconds.</p>
            </>
          )}
          {status === "paid" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-6" />
              <h1 className="hero-display font-bold text-2xl text-white mb-3">You're all set.</h1>
              <p className="text-on-surface-variant mb-8">
                Payment confirmed. Head to your dashboard to tell us what you need.
              </p>
              <Link
                to="/app"
                className="w-full py-4 bg-white text-background hover:bg-primary hover:text-white font-sans text-sm font-bold transition-all flex justify-center items-center rounded-xl"
              >
                Go to dashboard
              </Link>
            </>
          )}
          {(status === "timeout" || status === "not_found") && (
            <>
              <ErrorBanner message="We couldn't confirm your payment yet. If you were charged, it'll appear on your dashboard shortly — contact support@socialio.io if it doesn't." />
              <Link to="/app" className="text-primary hover:underline text-sm mt-6 inline-block">
                Go to dashboard anyway
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
