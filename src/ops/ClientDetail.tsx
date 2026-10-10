import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useAuth } from "../lib/auth/AuthContext";
import SidePanel from "../components/SidePanel";
import RequestDetail from "./RequestDetail";
import { STAGE_STYLE } from "../components/workspace/stageStyle";
import { STATUS_DOT, STATUS_TONE, clientStatus } from "./clientStatus";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import DeliverableList from "../components/DeliverableList";
import OnboardingAnswersView from "../components/OnboardingAnswersView";
import StatStrip from "../components/workspace/StatStrip";
import BrandKitEditor from "../components/workspace/BrandKitEditor";
import LedgerLines from "../components/workspace/LedgerLines";
import { computeLedger, loadLedgerData, type LedgerData } from "../components/workspace/LedgerData";
import ClientAccess from "./ClientAccess";
import ResultsEditor from "./ResultsEditor";
import { PlanStatusBadge } from "../components/StatusBadge";
import { formatCents, formatDate, formatDollars } from "../lib/format";
import type {
  ClientOnboarding,
  Deliverable,
  OnboardingAsset,
  Organization,
  Plan,
  PlanItem,
  Profile,
  Request,
} from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

type ClientData = {
  org: Organization;
  onboarding: ClientOnboarding | null;
  plan: Plan | null;
  planItems: PlanItem[];
  ledger: LedgerData; // orders, order lines, payments and requests
  deliverables: Deliverable[];
  assets: OnboardingAsset[];
  members: Profile[];
  staff: Profile[];
};

type RequestPatch = Partial<Pick<Request, "order_item_id" | "units">>;

const MAX_UNITS = 100;

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "work", label: "Work" },
  { key: "plan", label: "Plan & billing" },
  { key: "brief", label: "Brief & brand" },
  { key: "access", label: "Access" },
  { key: "results", label: "Results" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

async function loadClient(orgId: string): Promise<ClientData | null> {
  const [orgRes, onboardingRes, planRes, membersRes, staffRes, ledger] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase.from("client_onboarding").select("*").eq("org_id", orgId).maybeSingle(),
    supabase.from("plans").select("*").eq("org_id", orgId).neq("status", "superseded").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("*").eq("org_id", orgId),
    supabase.from("profiles").select("*").in("role", ["internal", "admin"]),
    loadLedgerData(orgId),
  ]);
  if (orgRes.error || onboardingRes.error || planRes.error || membersRes.error || staffRes.error || !ledger) {
    return null;
  }

  const plan = planRes.data as Plan | null;
  const requests = ledger.requests;
  const onboarding = onboardingRes.data as ClientOnboarding | null;
  const [itemsRes, deliverablesRes, assetsRes] = await Promise.all([
    plan ? supabase.from("plan_items").select("*").eq("plan_id", plan.id) : Promise.resolve({ data: [], error: null }),
    requests.length
      ? supabase.from("deliverables").select("*").in("request_id", requests.map((r) => r.id)).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    onboarding
      ? supabase.from("onboarding_assets").select("*").eq("onboarding_id", onboarding.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsRes.error || deliverablesRes.error || assetsRes.error) return null;

  return {
    org: orgRes.data as Organization,
    onboarding,
    plan,
    planItems: (itemsRes.data ?? []) as PlanItem[],
    ledger,
    deliverables: (deliverablesRes.data ?? []) as Deliverable[],
    assets: (assetsRes.data ?? []) as OnboardingAsset[],
    members: (membersRes.data ?? []) as Profile[],
    staff: (staffRes.data ?? []) as Profile[],
  };
}

// One client, everything about them, split into six sections so each
// screen stays short (and maps 1:1 to a future app screen). A callout at
// the top says the one thing the team should do next for this client.
export default function ClientDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ClientData | null>(null);
  const [ledgerError, setLedgerError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const section: SectionKey = SECTIONS.some((x) => x.key === params.get("section")) ? (params.get("section") as SectionKey) : "overview";
  const openId = params.get("item");

  const reload = useCallback(async () => {
    if (!orgId) return;
    const result = await loadClient(orgId);
    setData(result);
    setState(result ? "ready" : "error");
  }, [orgId]);

  useEffect(() => {
    setState("loading");
    reload();
  }, [reload]);

  const setSection = (key: SectionKey) => setParams(key === "overview" ? {} : { section: key }, { replace: true });
  const closeItem = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("item");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div>
        <ErrorBanner message="Couldn't load this client. Try refreshing." />
      </div>
    );
  }

  const { org, onboarding, plan, planItems, ledger, deliverables, assets, members, staff } = data;
  const { requests, orders, payments } = ledger;
  const lines = computeLedger(ledger);

  // Staff decide which purchased line a request draws down, and how many units.
  const saveRequest = async (id: string, patch: RequestPatch) => {
    setLedgerError("");
    const { error } = await supabase.from("requests").update(patch).eq("id", id);
    if (error) {
      setLedgerError("Couldn't update that request. Try again.");
      return;
    }
    setData((cur) =>
      cur && { ...cur, ledger: { ...cur.ledger, requests: cur.ledger.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) } },
    );
  };
  const staffName = (id: string | null) => (id ? staff.find((s) => s.id === id)?.full_name ?? "Unknown" : "Unassigned");
  const paidTotal = payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);
  const openRequests = requests.filter((r) => r.stage !== "delivered").length;

  const markReviewed = async () => {
    if (!onboarding) return;
    setReviewError("");
    const { error } = await supabase
      .from("client_onboarding")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: profile?.id })
      .eq("id", onboarding.id);
    if (error) {
      setReviewError("Couldn't mark it reviewed. Try again.");
      return;
    }
    await reload();
  };

  const status = clientStatus(onboarding, plan, null, requests.filter((r) => r.stage !== "delivered"));
  const planLink = `/ops/clients/plan?org=${org.id}`;
  const nextStep: { text: string; action: ReactNode } | null =
    onboarding?.status === "submitted"
      ? {
          text: "They've sent their brief. Read it under Brief & brand, then mark it reviewed.",
          action: (
            <button type="button" onClick={markReviewed} className="btn-primary shrink-0">
              Mark reviewed
            </button>
          ),
        }
      : onboarding?.status === "reviewed" && (!plan || plan.status === "draft" || plan.status === "changes_requested")
        ? {
            text: plan?.status === "changes_requested" ? "They asked for changes to their plan." : "Their brief is reviewed. Build their plan.",
            action: (
              <Link to={planLink} className="btn-primary shrink-0">
                {plan ? "Revise plan" : "Build plan"} <ArrowRight className="w-4 h-4" />
              </Link>
            ),
          }
        : null;

  return (
    <div>
      <Link to="/ops/clients" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="hero-display font-bold text-2xl md:text-3xl text-white mb-1 break-words">{org.name}</h1>
          <p className="text-sm text-on-surface-variant">
            Since {formatDate(org.created_at)} · {members.map((m) => m.full_name ?? "Unnamed").join(", ") || "No one has an account yet"}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_TONE[status.tone]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status.tone]}`} />
          {status.label}
        </span>
      </div>

      {nextStep && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 mb-6">
          <p className="flex items-center gap-3 text-sm font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500" />
            {nextStep.text}
          </p>
          {nextStep.action}
        </div>
      )}
      {reviewError && (
        <div className="mb-6">
          <ErrorBanner message={reviewError} />
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 mb-8" role="tablist" aria-label="Client sections">
        {SECTIONS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={section === x.key}
            onClick={() => setSection(x.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm transition-colors ${
              section === x.key ? "bg-white/10 text-white font-bold" : "text-on-surface-variant hover:text-white"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <div className="flex flex-col gap-10">
          <StatStrip
            stats={[
              { label: "Open", value: openRequests },
              { label: "Delivered", value: requests.length - openRequests },
              { label: "Files", value: deliverables.length },
              { label: "Paid to date", value: formatCents(paidTotal) },
            ]}
          />
          <Section title="What they bought and what's left">
            {lines.length === 0 ? <p className="text-sm text-on-surface-variant">No paid orders yet.</p> : <LedgerLines lines={lines} />}
          </Section>
        </div>
      )}

      {section === "work" && (
        <div className="flex flex-col gap-10">
          <Section title={`Pieces (${requests.length})`}>
            {ledgerError && <p className="text-error text-sm mb-3">{ledgerError}</p>}
            {requests.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No work yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {requests.map((r) => {
                  const stage = STAGE_STYLE[r.stage];
                  return (
                    <li key={r.id} className={`rounded-xl border border-white/10 border-l-4 ${stage.border} bg-surface-container px-4 py-3`}>
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <Link to={`?section=work&item=${r.id}`} className="font-bold text-white text-sm hover:text-primary min-w-0 break-words">
                          {r.title}
                        </Link>
                        <span className={`text-xs font-bold ${stage.text}`}>{r.stage === "review" ? "With client" : stage.clientLabel}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-on-surface-variant">
                        <span>{staffName(r.assigned_to)}</span>
                        <span>Due {formatDate(r.due_date)}</span>
                        {lines.length > 0 && (
                          <select
                            aria-label={`Order line for ${r.title}`}
                            value={r.order_item_id ?? ""}
                            onChange={(e) => saveRequest(r.id, { order_item_id: e.target.value || null })}
                            className="bg-background border border-white/10 rounded-lg px-2 py-1 text-white max-w-[12rem]"
                          >
                            <option value="">No line</option>
                            {lines.map((l) => (
                              <option key={l.item.id} value={l.item.id}>
                                {l.title} · {l.item.tier_label}
                              </option>
                            ))}
                          </select>
                        )}
                        <label className="flex items-center gap-1.5">
                          Units
                          <input
                            key={`${r.id}-${r.units}`}
                            type="number"
                            min={1}
                            max={MAX_UNITS}
                            defaultValue={r.units}
                            onBlur={(e) => {
                              const units = Number(e.target.value);
                              if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS) {
                                e.target.value = String(r.units);
                                return;
                              }
                              if (units !== r.units) saveRequest(r.id, { units });
                            }}
                            className="w-14 bg-background border border-white/10 rounded-lg px-2 py-1 text-white"
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
          <Section title={`Files (${deliverables.length})`}>
            <DeliverableList deliverables={deliverables} />
          </Section>
        </div>
      )}

      {section === "plan" && (
        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-10">
          <Section
            title="Plan"
            action={
              <Link to={planLink} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                {plan ? "Revise plan" : "Build plan"} <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {plan ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <PlanStatusBadge status={plan.status} />
                  <span className="font-bold text-white">{formatDollars(plan.total_price)}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {planItems.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4 text-sm">
                      <span className="text-white min-w-0">
                        {item.quantity} × {item.deliverable_label}
                        <span className="text-on-surface-variant"> · {item.frequency ?? "one-time"}{item.platform ? ` · ${item.platform}` : ""}</span>
                      </span>
                      <span className="text-on-surface-variant shrink-0">{formatDollars(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">No plan yet.</p>
            )}
          </Section>
          <Section title="Billing">
            {orders.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {orders.map((o) => (
                  <li key={o.id} className="flex justify-between text-sm">
                    <span className="text-white">
                      {formatDate(o.created_at)} <span className="text-on-surface-variant text-xs">· {o.status}</span>
                    </span>
                    <span className="text-white font-bold">{formatCents(o.amount_total, o.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      {section === "brief" && (
        <div className="flex flex-col gap-10">
          <Section title="Their brief" action={<span className="text-xs text-on-surface-variant">{(onboarding?.status ?? "not_started").replace("_", " ")}</span>}>
            <OnboardingAnswersView answers={onboarding?.answers} />
            {assets.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-bold text-on-surface-variant mb-3">Brand files they uploaded</div>
                <DeliverableList deliverables={assets} />
              </div>
            )}
          </Section>
          <Section title="Brand kit">
            <BrandKitEditor orgId={org.id} />
          </Section>
        </div>
      )}

      {section === "access" && (
        <Section title="Their social logins">
          <ClientAccess orgId={org.id} />
        </Section>
      )}

      {section === "results" && (
        <Section title="Monthly results">
          <ResultsEditor orgId={org.id} />
        </Section>
      )}

      {openId && (
        <SidePanel label="Work details" onClose={closeItem}>
          <RequestDetail id={openId} onChanged={reload} />
        </SidePanel>
      )}
    </div>
  );
}
