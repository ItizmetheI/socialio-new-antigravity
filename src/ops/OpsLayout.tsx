import React from "react";
import { Outlet } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, CalendarDays, Users2, Building2, FileText, ScrollText, UserCog, ClipboardList, Inbox } from "lucide-react";
import DashboardShell from "../components/DashboardShell";
import { useAuth } from "../lib/auth/AuthContext";
import RequireRole from "../lib/auth/RequireRole";

const STAFF_NAV_ITEMS = [
  { to: "/ops", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/ops/board", label: "Board", icon: KanbanSquare, end: false },
  { to: "/ops/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/ops/clients", label: "Clients", icon: Users2, end: false },
  { to: "/ops/onboarding", label: "Onboarding", icon: ClipboardList, end: false },
  { to: "/ops/admin/plans", label: "Plans", icon: ScrollText, end: false },
  { to: "/ops/leads", label: "Leads", icon: Inbox, end: false },
];

const ADMIN_NAV_ITEMS = [
  { to: "/ops/admin/orgs", label: "Organizations", icon: Building2, end: false },
  { to: "/ops/admin/proposals", label: "Proposals", icon: FileText, end: false },
  { to: "/ops/admin/users", label: "Users", icon: UserCog, end: false },
];

function OpsLayoutInner() {
  const { profile } = useAuth();

  return (
    <DashboardShell
      sections={[
        { items: STAFF_NAV_ITEMS },
        ...(profile?.role === "admin" ? [{ heading: "Admin", items: ADMIN_NAV_ITEMS }] : []),
      ]}
      workspaceName="Socialio Studio"
      workspaceDetail={profile?.full_name ?? undefined}
    >
      <Outlet />
    </DashboardShell>
  );
}

export default function OpsLayout() {
  return (
    <RequireRole roles={["internal", "admin"]}>
      <OpsLayoutInner />
    </RequireRole>
  );
}
