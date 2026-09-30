import React, { useEffect, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { House, UserRound } from "lucide-react";
import DashboardShell, { type NavItem } from "../components/DashboardShell";
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

// Clients get two pages: Home (all their work, plan and results) and Account
// (billing, brand kit, login). Onboarding and plan approval are reached from
// the home page's "next step" banner while they're pending.
const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Home", end: true, icon: House },
  { to: "/app/account", label: "Account", end: false, icon: UserRound },
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
          Pick the services you want and check out. Your dashboard opens as soon as your order goes through.
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
    return () => {
      isMounted = false;
    };
  }, [profile?.org_id]);


  if (!profile?.org_id) {
    // org_id is only ever set by an admin invite or by create-checkout-session,
    // so a signed-in client without one has signed up but not bought yet.
    return <NoWorkspaceYet />;
  }

  return (
    <DashboardShell items={NAV_ITEMS}>
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
