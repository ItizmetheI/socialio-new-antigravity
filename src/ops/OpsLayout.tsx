import React from "react";
import { Outlet } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import { useAuth } from "../lib/auth/AuthContext";
import RequireRole from "../lib/auth/RequireRole";

const STAFF_NAV_ITEMS = [
  { to: "/ops", label: "Overview", end: true },
  { to: "/ops/board", label: "Board", end: false },
  { to: "/ops/calendar", label: "Calendar", end: false },
  { to: "/ops/clients", label: "Clients", end: false },
  { to: "/ops/onboarding", label: "Onboarding", end: false },
  { to: "/ops/admin/plans", label: "Plans", end: false },
  { to: "/ops/leads", label: "Leads", end: false },
];

const ADMIN_NAV_ITEMS = [
  { to: "/ops/admin/everything", label: "Everything", end: false },
  { to: "/ops/admin/orgs", label: "Organizations", end: false },
  { to: "/ops/admin/proposals", label: "Proposals", end: false },
  { to: "/ops/admin/users", label: "Users", end: false },
];

function OpsLayoutInner() {
  const { profile } = useAuth();

  return (
    <DashboardShell
      sections={[
        { items: STAFF_NAV_ITEMS },
        ...(profile?.role === "admin" ? [{ heading: "Admin", items: ADMIN_NAV_ITEMS }] : []),
      ]}
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
