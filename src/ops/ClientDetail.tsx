import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import DeliverableList from "../components/DeliverableList";
import OnboardingAnswersView from "../components/OnboardingAnswersView";
import { PlanStatusBadge } from "../components/StatusBadge";
import { formatCents, formatDate, formatDollars } from "../lib/format";
import { REQUEST_STAGES } from "../lib/database.types";
import type {
  ClientOnboarding,
  Deliverable,
  OnboardingAsset,
  Order,
  Organization,
  Payment,
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
  requests: Request[];
  deliverables: Deliverable[];
  assets: OnboardingAsset[];
  members: Profile[];
  staff: Profile[];
  orders: Order[];
  payments: Payment[];
};

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

async function loadClient(orgId: string): Promise<ClientData | null> {
  const [orgRes, onboardingRes, planRes, requestsRes, membersRes, staffRes, ordersRes, paymentsRes] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase.from("client_onboarding").select("*").eq("org_id", orgId).maybeSingle(),
    supabase.from("plans").select("*").eq("org_id", orgId).neq("status", "superseded").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("requests").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("org_id", orgId),
    supabase.from("profiles").select("*").in("role", ["internal", "admin"]),
    supabase.from("orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("payments").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
  ]);
  if (orgRes.error || onboardingRes.error || planRes.error || requestsRes.error || membersRes.error || staffRes.error || ordersRes.error || paymentsRes.error) {
    return null;
  }

  const plan = planRes.data as Plan | null;
  const requests = (requestsRes.data ?? []) as Request[];
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
    requests,
    deliverables: (deliverablesRes.data ?? []) as Deliverable[],
    assets: (assetsRes.data ?? []) as OnboardingAsset[],
    members: (membersRes.data ?? []) as Profile[],
    staff: (staffRes.data ?? []) as Profile[],
    orders: (ordersRes.data ?? []) as Order[],
    payments: (paymentsRes.data ?? []) as Payment[],
  };
}

export default function ClientDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ClientData | null>(null);

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
      <div className="p-5 md:p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div className="p-5 md:p-10">
        <ErrorBanner message="Couldn't load this client. Try refreshing." />
      </div>
    );
  }

  const { org, onboarding, plan, planItems, requests, deliverables, assets, members, staff, orders, payments } = data;
  const staffName = (id: string | null) => (id ? staff.find((s) => s.id === id)?.full_name ?? "Unknown" : "Unassigned");
  const paidTotal = payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);
  const openRequests = requests.filter((r) => r.stage !== "delivered").length;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link to="/ops/clients" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="hero-display font-bold text-3xl text-white mb-1">{org.name}</h1>
          <p className="text-sm text-on-surface-variant">
            Joined {formatDate(org.created_at)} · {members.map((m) => m.full_name ?? "Unnamed").join(", ") || "No team members yet"}
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border border-white/10 bg-white/5 text-on-surface-variant">
          {org.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          ["Open requests", String(openRequests)],
          ["Delivered", String(requests.length - openRequests)],
          ["Files", String(deliverables.length)],
          ["Paid to date", formatCents(paidTotal)],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface-container border border-white/10 rounded-2xl p-5">
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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
          <Section title={`Requests (${requests.length})`}>
            {requests.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No requests yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {requests.map((r) => (
                  <Link
                    key={r.id}
                    to={`/ops/requests/${r.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="font-bold text-white text-sm">{r.title}</span>
                    <span className="flex items-center gap-4 text-xs text-on-surface-variant">
                      <span>{staffName(r.assigned_to)}</span>
                      <span>Due {formatDate(r.due_date)}</span>
                      <span className="font-bold uppercase tracking-wide text-primary">
                        {REQUEST_STAGES.find((s) => s.value === r.stage)?.label ?? r.stage}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
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
