import { Link } from "react-router-dom";
import { formatCents } from "../../../lib/format";
import type { Order, OrderItem, Organization, Payment } from "../../../lib/database.types";
import { lineTitle } from "../../../components/workspace/LedgerData";
import { fullWhen } from "./when";

const MONTHS = 12;

const ORDER_STATUS: Record<Order["status"], string> = {
  paid: "text-emerald-400 light:text-emerald-700",
  pending: "text-amber-300 light:text-amber-700",
  failed: "text-error",
  refunded: "text-on-surface-variant",
  canceled: "text-on-surface-variant",
};

const PAYMENT_STATUS: Record<Payment["status"], string> = {
  succeeded: "text-emerald-400 light:text-emerald-700",
  failed: "text-error",
  refunded: "text-on-surface-variant",
};

// Collected per calendar month, newest first, back to the first payment
// (at most a year) so a young business isn't shown a wall of $0.00 months.
function monthlyTotals(payments: Payment[], now = new Date()) {
  const first = payments.reduce((min, p) => (p.created_at < min ? p.created_at : min), now.toISOString());
  const firstDate = new Date(first);
  const span = (now.getFullYear() - firstDate.getFullYear()) * 12 + now.getMonth() - firstDate.getMonth() + 1;
  return Array.from({ length: Math.min(MONTHS, span) }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const cents = payments
      .filter((p) => p.status === "succeeded" && new Date(p.created_at) >= start && new Date(p.created_at) < end)
      .reduce((sum, p) => sum + p.amount, 0);
    return { label: start.toLocaleDateString("en-US", { month: "short", year: "numeric" }), cents };
  });
}

type Props = { orders: Order[]; orderItems: OrderItem[]; payments: Payment[]; orgs: Organization[] };

export default function MoneyView({ orders, orderItems, payments, orgs }: Props) {
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const months = monthlyTotals(payments);
  const peak = Math.max(1, ...months.map((m) => m.cents));
  const clientLink = (id: string) => (
    <Link to={`/ops/clients/${id}`} className="hover:text-primary">
      {orgName.get(id) ?? "Unknown client"}
    </Link>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-12 gap-y-12">
      <section>
        <h2 className="font-bold text-white mb-3">Collected by month</h2>
        <ul className="flex flex-col gap-2">
          {months.map((m) => (
            <li key={m.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_6rem] items-center gap-3 text-sm">
              <span className="text-on-surface-variant text-xs">{m.label}</span>
              <span className="h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden>
                <span className="block h-full bg-primary rounded-full" style={{ width: `${(m.cents / peak) * 100}%` }} />
              </span>
              <span className="text-right text-white tabular-nums">{formatCents(m.cents)}</span>
            </li>
          ))}
        </ul>

        <h2 className="font-bold text-white mt-10 mb-3">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm text-white truncate">{clientLink(p.org_id)}</span>
                  <span className="block text-xs text-on-surface-variant">
                    {fullWhen(p.created_at)} · {p.stripe_invoice_id ? "subscription invoice" : "checkout"}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm text-white tabular-nums">{formatCents(p.amount, p.currency)}</span>
                  <span className={`block text-xs ${PAYMENT_STATUS[p.status]}`}>{p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0">
        <h2 className="font-bold text-white mb-1">Every checkout</h2>
        <p className="text-xs text-on-surface-variant mb-3">Including ones that were started and never paid.</p>
        {orders.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No checkouts yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {orders.map((o) => {
              const items = orderItems.filter((i) => i.order_id === o.id);
              return (
                <li key={o.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{clientLink(o.org_id)}</span>
                      <span className="block text-xs text-on-surface-variant">
                        Started {fullWhen(o.created_at)}
                        {o.paid_at && ` · paid ${fullWhen(o.paid_at)}`}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm text-white tabular-nums">{formatCents(o.amount_total, o.currency)}</span>
                      <span className={`block text-xs ${ORDER_STATUS[o.status]}`}>{o.status}</span>
                    </span>
                  </div>
                  {items.length > 0 && (
                    <ul className="mt-1.5 text-xs text-on-surface-variant">
                      {items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3">
                          <span className="truncate">
                            {lineTitle(i.service_id)} · {i.tier_label}
                            {i.quantity > 1 && ` × ${i.quantity}`}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatCents(i.unit_amount * i.quantity, o.currency)}
                            {i.billing_interval === "month" && "/mo"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
