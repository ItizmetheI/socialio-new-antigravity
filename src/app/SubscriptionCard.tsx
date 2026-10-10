import { useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCents, formatDate } from "../lib/format";
import { readFunctionError } from "../lib/functionError";
import { planForSubscription } from "../lib/subscriptionPlan";
import ErrorBanner from "../components/ErrorBanner";
import type { Order, OrderItem, Subscription } from "../lib/database.types";

type Props = {
  subscription: Subscription;
  orders: Order[];
  items: OrderItem[];
  onChanged: (next: Subscription) => void;
};

const SUPPORT_EMAIL = "support@socialio.io";
const LIVE = ["active", "trialing", "past_due", "unpaid"];

// One monthly plan: what it is, when it renews, and cancel / undo. Plans are
// paid a month at a time, so cancelling only stops the next renewal; the
// month already paid for keeps running (and we keep delivering) to the end.
export default function SubscriptionCard({ subscription: sub, orders, items, onChanged }: Props) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [justChanged, setJustChanged] = useState<"cancel" | "resume" | null>(null);

  const plan = planForSubscription(sub, orders, items);
  const until = sub.current_period_end ? formatDate(sub.current_period_end) : "the end of this month";
  const isLive = LIVE.includes(sub.status);
  const isCancelling = isLive && sub.cancel_at_period_end;

  const change = async (action: "cancel" | "resume") => {
    setError("");
    setIsSaving(true);
    const { data, error: invokeError } = await supabase.functions.invoke<{
      cancel_at_period_end: boolean;
      current_period_end: string;
      status: Subscription["status"];
      error?: string;
    }>("manage-subscription", { body: { subscriptionId: sub.id, action } });
    setIsSaving(false);
    if (invokeError || !data || data.error) {
      const { message, status } = await readFunctionError(invokeError, data, "Couldn't update your plan.");
      setError(status !== undefined && status < 500 ? message : `Couldn't update your plan right now. Try again in a minute, or email ${SUPPORT_EMAIL}.`);
      return;
    }
    setIsConfirming(false);
    setJustChanged(action);
    onChanged({ ...sub, cancel_at_period_end: data.cancel_at_period_end, current_period_end: data.current_period_end, status: data.status });
  };

  const status = !isLive
    ? { dot: "bg-on-surface-variant", text: "text-on-surface-variant", line: sub.status === "canceled" ? `Ended${sub.current_period_end ? ` ${formatDate(sub.current_period_end)}` : ""}` : "Not active" }
    : sub.status === "past_due" || sub.status === "unpaid"
      ? { dot: "bg-red-500", text: "text-red-500", line: `Payment failed. Email ${SUPPORT_EMAIL} and we'll sort it out` }
      : isCancelling
        ? { dot: "bg-amber-500", text: "text-amber-600", line: `Cancelled · active until ${until}` }
        : { dot: "bg-emerald-500", text: "text-emerald-600", line: `Active · renews ${until}` };

  return (
    <div className="bg-surface-container border border-white/10 rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-white font-bold">{plan.label}</div>
          <div className={`flex items-center gap-2 text-sm mt-1 ${status.text}`}>
            <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
            {status.line}
          </div>
        </div>
        {plan.monthlyCents > 0 && (
          <div className="text-white font-bold whitespace-nowrap">
            {formatCents(plan.monthlyCents, plan.currency)}
            <span className="text-on-surface-variant font-normal text-sm"> / month</span>
          </div>
        )}
      </div>

      {justChanged === "cancel" && (
        <p role="status" className="mt-4 text-sm text-on-surface rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          Done. Your plan stays active and we keep delivering until <strong>{until}</strong>. After that you won't be charged again.
        </p>
      )}
      {justChanged === "resume" && (
        <p role="status" className="mt-4 text-sm text-on-surface rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
          Your plan is back on. It renews on <strong>{until}</strong> as usual.
        </p>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {isLive && !isCancelling && !isConfirming && (
        <button
          type="button"
          onClick={() => {
            setJustChanged(null);
            setIsConfirming(true);
          }}
          className="mt-4 text-sm text-on-surface-variant underline underline-offset-4 hover:text-white transition-colors"
        >
          Cancel plan
        </button>
      )}

      {isConfirming && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-bold text-white mb-1">Cancel {plan.label}?</p>
          <p className="text-sm text-on-surface-variant mb-4">
            You've already paid for this month, so nothing stops today. Your plan stays active and we keep delivering until{" "}
            <strong className="text-white">{until}</strong>. After that you won't be charged again. Change your mind before then? You can undo it right here.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={isSaving} onClick={() => change("cancel")} className="btn-secondary px-4 py-2 text-sm">
              {isSaving ? "Cancelling..." : "Yes, cancel at the end of this month"}
            </button>
            <button type="button" disabled={isSaving} onClick={() => setIsConfirming(false)} className="btn-primary px-4 py-2 text-sm">
              Keep my plan
            </button>
          </div>
        </div>
      )}

      {isCancelling && (
        <button
          type="button"
          disabled={isSaving}
          onClick={() => change("resume")}
          className="btn-secondary mt-4 px-4 py-2 text-sm"
        >
          {isSaving ? "Saving..." : "Keep my plan"}
        </button>
      )}
    </div>
  );
}
