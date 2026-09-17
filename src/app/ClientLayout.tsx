import React, { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, FileText, ScrollText, KanbanSquare, Settings as SettingsIcon, LogOut } from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../lib/auth/AuthContext";
import RequireRole from "../lib/auth/RequireRole";
import { supabase } from "../lib/supabase";
import type { Organization } from "../lib/database.types";

export type ClientOutletContext = {
  orgId: string;
  orgName: string;
};

const NAV_ITEMS = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/onboarding", label: "Onboarding", icon: ClipboardList, end: false },
  { to: "/app/plan", label: "Plan", icon: ScrollText, end: false },
  { to: "/app/proposal", label: "Proposal", icon: FileText, end: false },
  { to: "/app/requests", label: "Requests", icon: KanbanSquare, end: false },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon, end: false },
];

function ClientLayoutInner() {
  const { profile, signOut } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
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
    return () => {
      isMounted = false;
    };
  }, [profile?.org_id]);

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
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-white/10 flex flex-col shrink-0">
        <div className="px-6 py-8">
          <Logo />
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-6 border-t border-white/10">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{org?.name ?? "..."}</div>
              <div className="text-xs text-on-surface-variant truncate">{profile.full_name ?? ""}</div>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet context={{ orgId: profile.org_id, orgName: org?.name ?? "" } satisfies ClientOutletContext} />
      </main>
    </div>
  );
}

export default function ClientLayout() {
  return (
    <RequireRole roles={["client"]}>
      <ClientLayoutInner />
    </RequireRole>
  );
}
