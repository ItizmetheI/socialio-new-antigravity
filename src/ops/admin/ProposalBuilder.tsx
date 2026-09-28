import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatDollars } from "../../lib/format";
import { servicesData } from "../../data/services";
import { useAuth } from "../../lib/auth/AuthContext";
import Spinner from "../../components/Spinner";
import PageHeader from "../../components/workspace/PageHeader";
import ErrorBanner from "../../components/ErrorBanner";
import type { Organization } from "../../lib/database.types";

type LoadState = "loading" | "error" | "ready";

type DraftItem = {
  key: string;
  serviceId: string;
  tierLabel: string;
  price: number;
};

export default function ProposalBuilder() {
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(servicesData[0]?.id ?? "");
  const [items, setItems] = useState<DraftItem[]>([]);
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

  const selectedService = servicesData.find((s) => s.id === selectedServiceId);

  const addTier = (tierLabel: string, price: number) => {
    if (!selectedService) return;
    setItems((prev) => [
      ...prev,
      { key: `${selectedService.id}-${tierLabel}-${Date.now()}`, serviceId: selectedService.id, tierLabel, price },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = async () => {
    if (!orgId || items.length === 0 || !profile) return;
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .insert({ org_id: orgId, created_by: profile.id, total_price: total })
      .select()
      .single();

    if (proposalError || !proposal) {
      setIsSubmitting(false);
      setSubmitError(proposalError?.message ?? "Failed to create proposal");
      return;
    }

    const { error: itemsError } = await supabase.from("proposal_items").insert(
      items.map((item) => ({
        proposal_id: proposal.id,
        service_id: item.serviceId,
        tier_label: item.tierLabel,
        price: item.price,
      }))
    );

    setIsSubmitting(false);
    if (itemsError) {
      setSubmitError(itemsError.message);
      return;
    }

    setSubmitSuccess("Proposal sent. The client will see it as pending.");
    setItems([]);
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
      <PageHeader title="New proposal" description="Legacy proposals, for orgs that predate plans." />

      <div className="mb-8">
        <label htmlFor="proposalbuilder-organization" className="field-label">Organization</label>
        <select id="proposalbuilder-organization"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label htmlFor="proposalbuilder-service" className="field-label">Service</label>
          <select id="proposalbuilder-service"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="field appearance-none mb-4"
          >
            {servicesData.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-2">
            {selectedService?.sliderSteps.map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() => addTier(step.label, step.price)}
                className="flex items-center justify-between px-4 py-3 bg-surface-container border border-white/10 hover:border-primary/30 rounded-xl text-left transition-colors"
              >
                <span className="text-sm text-white">{step.label}</span>
                <span className="text-sm font-bold text-primary">{formatDollars(step.price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
            Line items
          </div>
          {items.length === 0 ? (
            <p className="text-on-surface-variant text-sm">Add tiers from the left to build the proposal.</p>
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
                    <div className="text-sm font-bold text-white">{item.tierLabel}</div>
                    <div className="text-xs text-on-surface-variant">{item.serviceId}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{formatDollars(item.price)}</span>
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
        {isSubmitting ? "Sending..." : "Send proposal"}
      </button>
    </div>
  );
}
