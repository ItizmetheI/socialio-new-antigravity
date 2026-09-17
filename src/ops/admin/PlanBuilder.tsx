import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { servicesData } from "../../data/services";
import { useAuth } from "../../lib/auth/AuthContext";
import Spinner from "../../components/Spinner";
import ErrorBanner from "../../components/ErrorBanner";
import type { Organization, Plan } from "../../lib/database.types";

type LoadState = "loading" | "error" | "ready";

type DraftItem = {
  key: string;
  serviceId: string | null;
  deliverableLabel: string;
  quantity: number;
  frequency: string;
  platform: string;
  price: number;
  notes: string;
};

const emptyDraft = (): DraftItem => ({
  key: `item-${Date.now()}`,
  serviceId: null,
  deliverableLabel: "",
  quantity: 1,
  frequency: "monthly",
  platform: "",
  price: 0,
  notes: "",
});

export default function PlanBuilder() {
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState("");
  const [existingPlan, setExistingPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setState("error");
          return;
        }
        const orgList = (data ?? []) as Organization[];
        setOrgs(orgList);
        setOrgId(orgList[0]?.id ?? "");
        setState("ready");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!orgId) {
      setExistingPlan(null);
      return;
    }
    let isMounted = true;
    supabase
      .from("plans")
      .select("*")
      .eq("org_id", orgId)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) setExistingPlan(data as Plan | null);
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  const addItem = () => {
    if (!draft.deliverableLabel.trim()) return;
    setItems((prev) => [...prev, draft]);
    setDraft(emptyDraft());
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isRevision = existingPlan?.status === "changes_requested";

  const handleSubmit = async () => {
    if (!orgId || items.length === 0 || !profile) return;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        org_id: orgId,
        created_by: profile.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        total_price: total,
        version: isRevision ? (existingPlan!.version + 1) : 1,
        supersedes_plan_id: isRevision ? existingPlan!.id : null,
      })
      .select()
      .single();

    if (planError || !plan) {
      setIsSubmitting(false);
      setSubmitError(planError?.message ?? "Failed to create plan");
      return;
    }

    const { error: itemsError } = await supabase.from("plan_items").insert(
      items.map((item) => ({
        plan_id: plan.id,
        service_id: item.serviceId,
        deliverable_label: item.deliverableLabel,
        quantity: item.quantity,
        frequency: item.frequency || null,
        platform: item.platform || null,
        price: item.price,
        notes: item.notes || null,
      }))
    );

    setIsSubmitting(false);
    if (itemsError) {
      setSubmitError(itemsError.message);
      return;
    }

    setSubmitSuccess("Plan sent. The client will see it as ready to review.");
    setItems([]);
    setExistingPlan(plan as Plan);
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
        <ErrorBanner message="Couldn't load organizations. Try refreshing." />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-4xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">
        {isRevision ? "Revise plan" : "New plan"}
      </h1>

      <div className="mb-8">
        <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
          Organization
        </label>
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full max-w-sm focus:outline-none focus:border-primary transition-colors appearance-none"
        >
          {orgs.length === 0 && <option value="">No organizations — invite a client first</option>}
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {existingPlan && (
          <p className="text-xs text-on-surface-variant mt-2">
            {isRevision
              ? `This org's client requested changes to plan v${existingPlan.version} — sending will create v${existingPlan.version + 1}.`
              : `This org already has an active plan (${existingPlan.status}). Sending a new one will supersede it.`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="flex flex-col gap-3">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Add line item
          </label>
          <select
            value={draft.serviceId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, serviceId: e.target.value || null }))}
            className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors appearance-none"
          >
            <option value="">Custom (no catalog service)</option>
            {servicesData.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Deliverable, e.g. '10 Social Media Posts'"
            value={draft.deliverableLabel}
            onChange={(e) => setDraft((d) => ({ ...d, deliverableLabel: e.target.value }))}
            className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              placeholder="Qty"
              value={draft.quantity}
              onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) || 1 }))}
              className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
            />
            <input
              type="text"
              placeholder="Frequency, e.g. monthly"
              value={draft.frequency}
              onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
              className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Platform (optional)"
              value={draft.platform}
              onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value }))}
              className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
            />
            <input
              type="number"
              min={0}
              placeholder="Price"
              value={draft.price || ""}
              onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }))}
              className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Notes (optional)"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!draft.deliverableLabel.trim()}
            className="px-4 py-3 bg-surface-container border border-white/10 hover:border-primary/30 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
          >
            Add to plan
          </button>
        </div>

        <div>
          <div className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
            Line items
          </div>
          {items.length === 0 ? (
            <p className="text-on-surface-variant text-sm">Add deliverables on the left to build the plan.</p>
          ) : (
            <div className="bg-surface-container border border-white/10 rounded-2xl overflow-hidden">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between px-5 py-4 ${
                    index !== items.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-white">{item.deliverableLabel}</div>
                    <div className="text-xs text-on-surface-variant">
                      {item.quantity} × {item.frequency || "one-time"}
                      {item.platform ? ` · ${item.platform}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">
                      ${(item.price * item.quantity).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="text-on-surface-variant hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02]">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-sm font-bold text-primary">${total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {submitError && (
        <div className="mb-6">
          <ErrorBanner message={submitError} />
        </div>
      )}
      {submitSuccess && <div className="text-primary text-sm mb-6">{submitSuccess}</div>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !orgId || items.length === 0}
        className="px-8 py-4 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : isRevision ? "Send revision" : "Send plan"}
      </button>
    </div>
  );
}
