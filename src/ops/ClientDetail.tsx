import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import DeliverableList from "../components/DeliverableList";
import OnboardingAnswersView from "../components/OnboardingAnswersView";
import StatStrip from "../components/workspace/StatStrip";
import BrandKitEditor from "../components/workspace/BrandKitEditor";
import LedgerLines from "../components/workspace/LedgerLines";
import { computeLedger, loadLedgerData, type LedgerData } from "../components/workspace/LedgerData";
import ResultsEditor from "./ResultsEditor";
import { PlanStatusBadge } from "../components/StatusBadge";
import { formatCents, formatDate, formatDollars } from "../lib/format";
import { REQUEST_STAGES } from "../lib/database.types";
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

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-6">
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

export default function ClientDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ClientData | null>(null);
  const [ledgerError, setLedgerError] = useState("");

  useEffect(() => {
    if (!orgId) return;
    let isMounted = true;
    setState("loading");
    loadClient(orgId).then((result) => {
      if (!isMounted) return;
      setData(result);
      setState(result ? "ready" : "error");
    });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

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

  return (
    <div>
      <Link to="/ops/clients" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="hero-display font-bold text-2xl md:text-3xl text-white mb-1">{org.name}</h1>
          <p className="text-sm text-on-surface-variant">
            Joined {formatDate(org.created_at)} · {members.map((m) => m.full_name ?? "Unnamed").join(", ") || "No team members yet"}
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border border-white/10 bg-white/5 text-on-surface-variant">
          {org.status}
        </span>
      </div>

      <StatStrip
        stats={[
          { label: "Open requests", value: openRequests },
          { label: "Delivered", value: requests.length - openRequests },
          { label: "Files", value: deliverables.length },
          { label: "Paid to date", value: formatCents(paidTotal) },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-x-12 gap-y-12">
        <Section
          title="Plan"
          action={
            <Link to={`/ops/admin/plans?org=${org.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
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
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-white">
                      {item.quantity} × {item.deliverable_label}
                      <span className="text-on-surface-variant"> · {item.frequency ?? "one-time"}{item.platform ? ` · ${item.platform}` : ""}</span>
                    </span>
                    <span className="text-on-surface-variant">{formatDollars(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">No plan yet.</p>
          )}
        </Section>

        <Section
          title="Onboarding"
          action={
            <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {(onboarding?.status ?? "not_started").replace("_", " ")}
            </span>
          }
        >
          <OnboardingAnswersView answers={onboarding?.answers} />
          {assets.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Brand files</div>
              <DeliverableList deliverables={assets} />
            </div>
          )}
        </Section>

        <div className="lg:col-span-2">
          <Section title="Ledger">
            {lines.length === 0 ? <p className="text-sm text-on-surface-variant">No paid orders yet.</p> : <LedgerLines lines={lines} />}
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title={`Requests (${requests.length})`}>
            {ledgerError && <p className="text-red-400 text-sm mb-3">{ledgerError}</p>}
            {requests.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No requests yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {requests.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <Link to={`/ops/requests/${r.id}`} className="font-bold text-white text-sm hover:underline min-w-0 truncate">
                      {r.title}
                    </Link>
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-on-surface-variant">
                      <span>{staffName(r.assigned_to)}</span>
                      <span>Due {formatDate(r.due_date)}</span>
                      <span className="font-bold uppercase tracking-wide text-primary">
                        {REQUEST_STAGES.find((s) => s.value === r.stage)?.label ?? r.stage}
                      </span>
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
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Results">
            <ResultsEditor orgId={org.id} />
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Brand kit">
            <BrandKitEditor orgId={org.id} />
          </Section>
        </div>

        <Section title={`Files (${deliverables.length})`}>
          <DeliverableList deliverables={deliverables} />
        </Section>

        <Section title="Billing">
          {orders.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No orders yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orders.map((o) => (
                <li key={o.id} className="flex justify-between text-sm">
                  <span className="text-white">
                    {formatDate(o.created_at)} <span className="text-on-surface-variant uppercase text-xs font-bold">· {o.status}</span>
                  </span>
                  <span className="text-white font-bold">{formatCents(o.amount_total, o.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
