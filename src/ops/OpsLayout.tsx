import { Outlet } from "react-router-dom";
import { Columns3, Inbox, ShieldCheck, Sun, Users } from "lucide-react";
import DashboardShell, { type NavItem } from "../components/DashboardShell";
import { useAuth } from "../lib/auth/AuthContext";
import RequireRole from "../lib/auth/RequireRole";

// Four places for the team, five for admins — the same set works as a phone
// bottom bar. Everything client-specific (plan, onboarding, billing,
// invites) lives inside that client's hub under Clients.
const STAFF_NAV_ITEMS: NavItem[] = [
  { to: "/ops", label: "Today", end: true, icon: Sun },
  { to: "/ops/work", label: "Work", end: false, icon: Columns3 },
  { to: "/ops/clients", label: "Clients", end: false, icon: Users },
  { to: "/ops/leads", label: "Leads", end: false, icon: Inbox },
];

const ADMIN_NAV_ITEM: NavItem = { to: "/ops/admin", label: "Admin", end: false, icon: ShieldCheck };

function OpsLayoutInner() {
  const { profile } = useAuth();
  const items = profile?.role === "admin" ? [...STAFF_NAV_ITEMS, ADMIN_NAV_ITEM] : STAFF_NAV_ITEMS;
  return (
    <DashboardShell items={items}>
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
