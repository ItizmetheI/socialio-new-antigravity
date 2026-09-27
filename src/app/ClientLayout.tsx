import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, FileText, ScrollText, KanbanSquare, CreditCard, Settings as SettingsIcon } from "lucide-react";
import DashboardShell from "../components/DashboardShell";
import { useAuth } from "../lib/auth/AuthContext";
import RequireRole from "../lib/auth/RequireRole";
import { supabase } from "../lib/supabase";
import type { Organization } from "../lib/database.types";

export type ClientOutletContext = {
  orgId: string;
  orgName: string;
};

const BASE_NAV_ITEMS = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/onboarding", label: "Onboarding", icon: ClipboardList, end: false },
];

const TAIL_NAV_ITEMS = [
  { to: "/app/requests", label: "Requests", icon: KanbanSquare, end: false },
  { to: "/app/billing", label: "Billing", icon: CreditCard, end: false },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon, end: false },
];

function ClientLayoutInner() {
  const { profile, signOut } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  // An org is either on the new plans system or the legacy proposals one,
  // never both (see DashboardHome's isApproved logic) — the nav should
  // reflect that instead of always showing both links.
  const [hasPlan, setHasPlan] = useState(false);
  const navigate = useNavigate();

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
    ...BASE_NAV_ITEMS,
    hasPlan
      ? { to: "/app/plan", label: "Plan", icon: ScrollText, end: false }
      : { to: "/app/proposal", label: "Proposal", icon: FileText, end: false },
    ...TAIL_NAV_ITEMS,
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/app/login", { replace: true });
  };

  if (!profile?.org_id) {
    // org_id is only ever set by an admin invite or by create-checkout-session
    // (which links the profile in the same request that creates the order) —
    // so a signed-in client with no org_id has always just signed up and
    // never checked out yet, not a broken account. Send them to finish that,
    // same as a signed-out visitor with items in cart.
    return <Navigate to="/checkout" replace />;
  }

  return (
    <DashboardShell
      sections={[{ items: navItems }]}
      accountName={org?.name ?? "..."}
      accountDetail={profile.full_name ?? ""}
      onSignOut={handleSignOut}
    >
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
