import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDollars } from "../lib/format";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import PageHeader from "../components/workspace/PageHeader";
import { PlanStatusBadge } from "../components/StatusBadge";
import { useAuth } from "../lib/auth/AuthContext";
import type { Plan, PlanItem, PlanFeedback } from "../lib/database.types";
import type { ClientOutletContext } from "./ClientLayout";

type LoadState = "loading" | "error" | "ready";

export default function PlanView() {
  const { orgId } = useOutletContext<ClientOutletContext>();
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [feedback, setFeedback] = useState<PlanFeedback[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [actionError, setActionError] = useState("");
  const [feedbackBody, setFeedbackBody] = useState("");
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("org_id", orgId)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      setState("error");
      return;
    }
    if (!planData) {
      setPlan(null);
      setItems([]);
      setFeedback([]);
      setState("ready");
      return;
    }

    const [itemsRes, feedbackRes] = await Promise.all([
      supabase.from("plan_items").select("*").eq("plan_id", planData.id),
      supabase.from("plan_feedback").select("*").eq("plan_id", planData.id).order("created_at", { ascending: true }),
    ]);
    if (itemsRes.error || feedbackRes.error) {
      setState("error");
      return;
    }

    setPlan(planData as Plan);
    setItems((itemsRes.data ?? []) as PlanItem[]);
    setFeedback((feedbackRes.data ?? []) as PlanFeedback[]);
    setState("ready");

    // First open of a sent plan marks it viewed — fire and forget, reflects
    // on next load rather than blocking render on it.
    if (planData.status === "sent") {
      supabase.from("plans").update({ status: "viewed" }).eq("id", planData.id).then(() => {});
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (status: "approved" | "changes_requested") => {
    if (!plan) return;
    setIsResponding(true);
    setActionError("");
    const { error } = await supabase.from("plans").update({ status }).eq("id", plan.id);
    setIsResponding(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    await load();
  };

  const postFeedback = async () => {
    if (!plan || !profile || !feedbackBody.trim()) return;
    setIsPostingFeedback(true);
    const { error } = await supabase
      .from("plan_feedback")
      .insert({ plan_id: plan.id, author_id: profile.id, body: feedbackBody.trim() });
    setIsPostingFeedback(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setFeedbackBody("");
    await load();
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <ErrorBanner message="Couldn't load your plan. Try refreshing." />
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <EmptyState
          title="No plan yet"
          description="Once we've reviewed your onboarding info, your curated plan will show up here."
        />
      </div>
    );
  }

  const canRespond = plan.status === "sent" || plan.status === "viewed";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Your plan${plan.version > 1 ? ` (v${plan.version})` : ""}`}
        description="The scope and monthly price we curated for you."
        action={<PlanStatusBadge status={plan.status} />}
      />

      <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden mb-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start justify-between gap-4 px-5 md:px-8 py-5 md:py-6 ${
              index !== items.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="font-bold text-white break-words">{item.deliverable_label}</div>
              <div className="text-sm text-on-surface-variant">
                {item.quantity} × {item.frequency || "one-time"}
                {item.platform ? ` · ${item.platform}` : ""}
              </div>
              {item.notes && <div className="text-xs text-on-surface-variant mt-1">{item.notes}</div>}
            </div>
            <div className="font-bold text-white shrink-0">{formatDollars(item.price * item.quantity)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-5 md:py-6 bg-white/[0.02]">
          <div className="font-bold text-white">Total</div>
          <div className="font-bold text-xl text-primary">{formatDollars(plan.total_price)}</div>
        </div>
      </div>

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {canRespond && (
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <button
            onClick={() => respond("approved")}
            disabled={isResponding}
            className="btn-primary flex-1"
          >
            Approve
          </button>
          <button
            onClick={() => respond("changes_requested")}
            disabled={isResponding}
            className="btn-secondary flex-1"
          >
            Request changes
          </button>
        </div>
      )}

      <h2 className="font-bold text-white mb-4">Feedback</h2>
      <div className="flex flex-col gap-3 mb-4">
        {feedback.map((f) => (
          <div key={f.id} className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4">
            <p className="text-white text-sm break-words whitespace-pre-line">{f.body}</p>
            <p className="text-xs text-on-surface-variant mt-2">{new Date(f.created_at).toLocaleString()}</p>
          </div>
        ))}
        {feedback.length === 0 && <p className="text-sm text-on-surface-variant">No feedback yet.</p>}
      </div>
      <div className="flex flex-col gap-3">
        <textarea
          aria-label="Feedback on this plan"
          rows={3}
          value={feedbackBody}
          onChange={(e) => setFeedbackBody(e.target.value)}
          placeholder="Leave a note about this plan..."
          className="field resize-none"
        />
        <button
          onClick={postFeedback}
          disabled={isPostingFeedback || !feedbackBody.trim()}
          className="btn-secondary self-start"
        >
          {isPostingFeedback ? "Posting..." : "Post feedback"}
        </button>
      </div>
    </div>
  );
}
