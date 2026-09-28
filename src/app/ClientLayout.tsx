import React, { useEffect, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { LayoutDashboard, ClipboardList, FileText, ScrollText, KanbanSquare, CreditCard, CalendarDays, Palette, TrendingUp } from "lucide-react";
import DashboardShell from "../components/DashboardShell";
import NavBar from "../components/NavBar";
import { useAuth } from "../lib/auth/AuthContext";
import { useCart } from "../context/CartContext";
import RequireRole from "../lib/auth/RequireRole";
import { supabase } from "../lib/supabase";
import type { Organization } from "../lib/database.types";

export type ClientOutletContext = {
  orgId: string;
  orgName: string;
};

const LEAD_NAV_ITEMS = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/requests", label: "Pipeline", icon: KanbanSquare, end: false },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/app/brand", label: "Brand kit", icon: Palette, end: false },
  { to: "/app/results", label: "Results", icon: TrendingUp, end: false },
];

const TAIL_NAV_ITEMS = [
  { to: "/app/onboarding", label: "Onboarding", icon: ClipboardList, end: false },
  { to: "/app/billing", label: "Billing", icon: CreditCard, end: false },
];

// Signed up but hasn't bought anything yet: no org to show. Used to bounce
// to /checkout, which with an empty cart bounced again to the home page.
function NoWorkspaceYet() {
  const { items } = useCart();
  if (items.length > 0) return <Navigate to="/checkout" replace />;
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-xl mx-auto px-5 pt-40 pb-20 text-center">
        <h1 className="hero-display font-bold text-3xl md:text-4xl text-white mb-4">
          Your account is <span className="italic text-primary">ready.</span>
        </h1>
        <p className="text-on-surface-variant mb-8">
          Pick the services you want and check out. Your dashboard (pipeline, calendar, brand kit and results) opens as soon as your order goes through.
        </p>
        <Link
          to="/pricing"
          className="inline-block px-8 py-4 bg-white text-background hover:bg-primary hover:text-[#fff] font-bold text-sm rounded-xl transition-colors"
        >
          See plans &amp; pricing
        </Link>
      </div>
    </div>
  );
}

function ClientLayoutInner() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  // An org is either on the new plans system or the legacy proposals one,
  // never both (see DashboardHome's isApproved logic) — the nav should
  // reflect that instead of always showing both links.
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    if (!profile?.org_id) return;
    let isMounted = true;
    supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.org_id)
      .single()
      .then(({ data }) => {
        if (isMounted) setOrg(data as Organization | null);
      });
    supabase
      .from("plans")
      .select("id")
      .eq("org_id", profile.org_id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) setHasPlan(!!data);
      });
    return () => {
      isMounted = false;
    };
  }, [profile?.org_id]);

  const navItems = [
    ...LEAD_NAV_ITEMS,
    hasPlan
      ? { to: "/app/plan", label: "Plan", icon: ScrollText, end: false }
      : { to: "/app/proposal", label: "Proposal", icon: FileText, end: false },
    ...TAIL_NAV_ITEMS,
  ];

  if (!profile?.org_id) {
    // org_id is only ever set by an admin invite or by create-checkout-session,
    // so a signed-in client without one has signed up but not bought yet.
    return <NoWorkspaceYet />;
  }

  return (
    <DashboardShell sections={[{ items: navItems }]} workspaceName={org?.name ?? ""} workspaceDetail={profile.full_name ?? undefined}>
      <Outlet context={{ orgId: profile.org_id, orgName: org?.name ?? "" } satisfies ClientOutletContext} />
    </DashboardShell>
  );
}

export default function ClientLayout() {
  return (
    <RequireRole roles={["client"]}>
      <ClientLayoutInner />
    </RequireRole>
  );
}
