import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
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
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-10">
        <ErrorBanner message="Couldn't load your plan. Try refreshing." />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-10">
        <EmptyState
          title="No plan yet"
          description="Once we've reviewed your onboarding info, your curated plan will show up here."
        />
      </div>
    );
  }

  const canRespond = plan.status === "sent" || plan.status === "viewed";

  return (
    <div className="p-10 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="hero-display font-bold text-3xl text-white">Your plan{plan.version > 1 ? ` (v${plan.version})` : ""}</h1>
        <PlanStatusBadge status={plan.status} />
      </div>

      <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden mb-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between px-8 py-6 ${
              index !== items.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div>
              <div className="font-bold text-white">{item.deliverable_label}</div>
              <div className="text-sm text-on-surface-variant">
                {item.quantity} × {item.frequency || "one-time"}
                {item.platform ? ` · ${item.platform}` : ""}
              </div>
              {item.notes && <div className="text-xs text-on-surface-variant mt-1">{item.notes}</div>}
            </div>
            <div className="font-bold text-white">${(item.price * item.quantity).toLocaleString()}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02]">
          <div className="font-bold text-white">Total</div>
          <div className="font-bold text-xl text-primary">${plan.total_price.toLocaleString()}</div>
        </div>
      </div>

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {canRespond && (
        <div className="flex gap-4 mb-10">
          <button
            onClick={() => respond("approved")}
            disabled={isResponding}
            className="flex-1 py-4 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => respond("changes_requested")}
            disabled={isResponding}
            className="flex-1 py-4 border border-white/20 text-white hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            Request changes
          </button>
        </div>
      )}

      <h2 className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-4">
        Feedback
      </h2>
      <div className="flex flex-col gap-3 mb-4">
        {feedback.map((f) => (
          <div key={f.id} className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4">
            <p className="text-white text-sm">{f.body}</p>
            <p className="text-xs text-on-surface-variant mt-2">{new Date(f.created_at).toLocaleString()}</p>
          </div>
        ))}
        {feedback.length === 0 && <p className="text-sm text-on-surface-variant">No feedback yet.</p>}
      </div>
      <div className="flex flex-col gap-3">
        <textarea
          rows={3}
          value={feedbackBody}
          onChange={(e) => setFeedbackBody(e.target.value)}
          placeholder="Leave a note about this plan..."
          className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <button
          onClick={postFeedback}
          disabled={isPostingFeedback || !feedbackBody.trim()}
          className="self-start px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
        >
          {isPostingFeedback ? "Posting..." : "Post feedback"}
        </button>
      </div>
    </div>
  );
}
