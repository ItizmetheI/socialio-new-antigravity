import { useEffect, useState } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { servicesData } from "../data/services";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import type { ContactSubmission, LeadStatus, NewsletterSignup } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";
type Tab = "contact" | "newsletter";

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  contacted: "bg-amber-400/10 text-amber-500 border-amber-400/20",
  closed: "bg-white/5 text-on-surface-variant border-white/10",
};

const serviceTitle = (id: string | null) => servicesData.find((s) => s.id === id)?.title ?? id;

export default function LeadsInbox() {
  const [state, setState] = useState<LoadState>("loading");
  const [tab, setTab] = useState<Tab>("contact");
  const [leads, setLeads] = useState<ContactSubmission[]>([]);
  const [signups, setSignups] = useState<NewsletterSignup[]>([]);
  const [updateError, setUpdateError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_signups").select("*").order("created_at", { ascending: false }),
    ]).then(([leadsRes, signupsRes]) => {
      if (!isMounted) return;
      if (leadsRes.error || signupsRes.error) {
        setState("error");
        return;
      }
      setLeads((leadsRes.data ?? []) as ContactSubmission[]);
      setSignups((signupsRes.data ?? []) as NewsletterSignup[]);
      setState("ready");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const setStatus = async (lead: ContactSubmission, status: LeadStatus) => {
    setUpdateError("");
    const previous = leads;
    setLeads((current) => current.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    const { error } = await supabase.from("contact_submissions").update({ status }).eq("id", lead.id);
    if (error) {
      setLeads(previous);
      setUpdateError(`Couldn't update ${lead.name}'s status: ${error.message}`);
    }
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(signups.map((s) => s.email).join(", "));
    } catch {
      setUpdateError("Your browser blocked copying. Select the emails below and copy them manually.");
      return;
    }
    setUpdateError("");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state === "loading") {
    return (
      <div className="p-5 md:p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-5 md:p-10">
        <ErrorBanner message="Couldn't load leads. Try refreshing." />
      </div>
    );
  }

  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <div className="p-5 md:p-10 max-w-5xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-2">Leads</h1>
      <p className="text-on-surface-variant mb-8">
        Everyone who used the contact form or joined the newsletter.
      </p>

      <div className="flex gap-2 mb-8" role="tablist">
        {([
          ["contact", `Contact form (${leads.length})`],
          ["newsletter", `Newsletter (${signups.length})`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
              tab === value ? "bg-white text-background border-white" : "text-on-surface-variant border-white/10 hover:text-white"
            }`}
          >
            {label}
            {value === "contact" && newCount > 0 && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-[#fff]">{newCount} new</span>
            )}
          </button>
        ))}
      </div>

      {updateError && (
        <div className="mb-6">
          <ErrorBanner message={updateError} />
        </div>
      )}

      {tab === "contact" &&
        (leads.length === 0 ? (
          <EmptyState title="No contact requests yet" description="Messages sent from the Contact page show up here." />
        ) : (
          <div className="flex flex-col gap-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-surface-container border border-white/10 rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="font-bold text-white">
                      {lead.name}
                      {lead.company && <span className="text-on-surface-variant font-medium"> · {lead.company}</span>}
                    </div>
                    <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Mail className="w-3.5 h-3.5" /> {lead.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant">{new Date(lead.created_at).toLocaleString()}</span>
                    <select
                      value={lead.status}
                      onChange={(e) => setStatus(lead, e.target.value as LeadStatus)}
                      aria-label={`Status for ${lead.name}`}
                      className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border focus:outline-none ${STATUS_STYLES[lead.status]}`}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {(lead.service || lead.budget) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lead.service && (
                      <span className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-on-surface-variant">
                        {serviceTitle(lead.service)}
                      </span>
                    )}
                    {lead.budget && (
                      <span className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-on-surface-variant">
                        {lead.budget}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-white whitespace-pre-wrap">{lead.message}</p>
              </div>
            ))}
          </div>
        ))}

      {tab === "newsletter" &&
        (signups.length === 0 ? (
          <EmptyState title="No newsletter signups yet" description="Emails from the footer and Blog signup forms show up here." />
        ) : (
          <div>
            <button
              onClick={copyEmails}
              className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm font-bold text-white hover:bg-white/5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy all emails"}
            </button>
            <div className="bg-surface-container border border-white/10 rounded-2xl overflow-hidden">
              {signups.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between px-6 py-3 text-sm ${i !== signups.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <span className="text-white">{s.email}</span>
                  <span className="text-on-surface-variant text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
