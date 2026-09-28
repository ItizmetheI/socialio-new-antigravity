import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatDollars } from "../../lib/format";
import { servicesData } from "../../data/services";
import { useAuth } from "../../lib/auth/AuthContext";
import Spinner from "../../components/Spinner";
import PageHeader from "../../components/workspace/PageHeader";
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
  // ?org= preselects a client when arriving from their client page.
  const [searchParams] = useSearchParams();
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
        const requested = searchParams.get("org");
        setOrgId(orgList.some((o) => o.id === requested) ? requested! : orgList[0]?.id ?? "");
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <ErrorBanner message="Couldn't load organizations. Try refreshing." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={isRevision ? "Revise plan" : "New plan"}
        description="Line items and prices the client will review and approve."
      />

      <div className="mb-8">
        <label htmlFor="planbuilder-organization" className="field-label">Organization</label>
        <select id="planbuilder-organization"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="field max-w-sm appearance-none"
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
          <label htmlFor="planbuilder-add-line-item" className="field-label mb-0">Add line item</label>
          <select id="planbuilder-add-line-item"
            value={draft.serviceId ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, serviceId: e.target.value || null }))}
            className="field appearance-none"
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
              aria-label="Deliverable"
            value={draft.deliverableLabel}
            onChange={(e) => setDraft((d) => ({ ...d, deliverableLabel: e.target.value }))}
            className="field"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              placeholder="Qty"
              aria-label="Qty"
              value={draft.quantity}
              onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) || 1 }))}
              className="field"
            />
            <input
              type="text"
              placeholder="Frequency, e.g. monthly"
              aria-label="Frequency"
              value={draft.frequency}
              onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
              className="field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Platform (optional)"
              aria-label="Platform"
              value={draft.platform}
              onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value }))}
              className="field"
            />
            <input
              type="number"
              min={0}
              placeholder="Price"
              aria-label="Price"
              value={draft.price || ""}
              onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }))}
              className="field"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Notes (optional)"
              aria-label="Notes"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            className="field resize-none"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!draft.deliverableLabel.trim()}
            className="btn-secondary"
          >
            Add to plan
          </button>
        </div>

        <div>
          <div className="field-label">Line items</div>
          {items.length === 0 ? (
            <p className="text-on-surface-variant text-sm">Add deliverables on the left to build the plan.</p>
          ) : (
            <div className="bg-surface-container border border-white/10 rounded-2xl overflow-hidden">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    index !== items.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white break-words">{item.deliverableLabel}</div>
                    <div className="text-xs text-on-surface-variant">
                      {item.quantity} × {item.frequency || "one-time"}
                      {item.platform ? ` · ${item.platform}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-white">
                      {formatDollars(item.price * item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      aria-label={`Remove ${item.deliverableLabel}`}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02]">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-sm font-bold text-primary">{formatDollars(total)}</span>
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
        className="btn-primary"
      >
        {isSubmitting ? "Sending..." : isRevision ? "Send revision" : "Send plan"}
      </button>
    </div>
  );
}
