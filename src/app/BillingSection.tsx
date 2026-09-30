import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { servicesData, addOnsData } from "../data/services";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { formatCents, formatDate } from "../lib/format";
import type { Order, OrderItem, Payment, Subscription } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

const SUPPORT_EMAIL = "support@socialio.io";

const itemTitle = (id: string) =>
  servicesData.find((s) => s.id === id)?.title ?? addOnsData.find((a) => a.id === id)?.title ?? id;

const ORDER_STATUS_STYLES: Record<Order["status"], string> = {
  paid: "text-emerald-600 bg-emerald-400/10 border-emerald-400/20",
  pending: "text-amber-600 bg-amber-400/10 border-amber-400/20",
  failed: "text-red-500 bg-red-400/10 border-red-400/20",
  refunded: "text-on-surface-variant bg-white/5 border-white/10",
  canceled: "text-on-surface-variant bg-white/5 border-white/10",
};

// Account page section: subscription, every order, every payment.
export default function BillingSection({ orgId }: { orgId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [subsRes, ordersRes, paymentsRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      ]);
      if (subsRes.error || ordersRes.error || paymentsRes.error) {
        if (isMounted) setState("error");
        return;
      }
      const orderRows = (ordersRes.data ?? []) as Order[];
      const itemsRes = orderRows.length
        ? await supabase.from("order_items").select("*").in("order_id", orderRows.map((o) => o.id))
        : { data: [], error: null };
      if (!isMounted) return;
      if (itemsRes.error) {
        setState("error");
        return;
      }
      setSubscription(subsRes.data as Subscription | null);
      setOrders(orderRows);
      setItems((itemsRes.data ?? []) as OrderItem[]);
      setPayments((paymentsRes.data ?? []) as Payment[]);
      setState("ready");
    })();
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <ErrorBanner message="Couldn't load your billing details. Try refreshing." />
      </div>
    );
  }

  return (
    <div>
      <section className="bg-surface-container border border-white/10 rounded-2xl p-5 md:p-6 mb-8">
        <h3 className="font-bold text-white mb-4">Your subscription</h3>
        {subscription ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-white font-bold capitalize">{subscription.status.replace("_", " ")}</div>
              <div className="text-sm text-on-surface-variant">
                {subscription.cancel_at_period_end ? "Ends" : "Renews"} on {formatDate(subscription.current_period_end)}
              </div>
            </div>
            <p className="text-sm text-on-surface-variant max-w-sm">
              To change volume, pause, or cancel, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> — changes apply from your next billing cycle.
            </p>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">
            No active subscription.{" "}
            <Link to="/pricing" className="text-primary hover:underline">See plans</Link>
          </p>
        )}
      </section>

      <section className="mb-8">
        <h3 className="font-bold text-white mb-4">Orders</h3>
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Purchases you make at checkout show up here." />
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-surface-container border border-white/10 rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="text-sm text-on-surface-variant">{formatDate(order.created_at)}</div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${ORDER_STATUS_STYLES[order.status]}`}>
                      {order.status}
                    </span>
                    <span className="font-bold text-white">{formatCents(order.amount_total, order.currency)}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-1">
                  {items
                    .filter((item) => item.order_id === order.id)
                    .map((item) => (
                      <li key={item.id} className="flex justify-between gap-4 text-sm">
                        <span className="text-white min-w-0">
                          {itemTitle(item.service_id)} <span className="text-on-surface-variant">· {item.tier_label}</span>
                        </span>
                        <span className="text-on-surface-variant shrink-0">
                          {formatCents(item.unit_amount * item.quantity, order.currency)}
                          {item.billing_interval === "month" ? "/mo" : ""}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {payments.length > 0 && (
        <section>
          <h3 className="font-bold text-white mb-4">Payment history</h3>
          <div className="bg-surface-container border border-white/10 rounded-2xl overflow-hidden">
            {payments.map((payment, i) => (
              <div key={payment.id} className={`flex justify-between gap-4 px-5 py-3 text-sm ${i !== payments.length - 1 ? "border-b border-white/5" : ""}`}>
                <span className="text-white">{formatDate(payment.created_at)}</span>
                <span className="flex gap-4">
                  <span className="text-on-surface-variant capitalize">{payment.status}</span>
                  <span className="text-white font-bold">{formatCents(payment.amount, payment.currency)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
