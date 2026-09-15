import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { KanbanSquare, Users2, Building2, FileText, UserCog, LogOut } from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../lib/auth/AuthContext";
import RequireRole from "../lib/auth/RequireRole";

const STAFF_NAV_ITEMS = [
  { to: "/ops", label: "Board", icon: KanbanSquare, end: true },
  { to: "/ops/clients", label: "Clients", icon: Users2, end: false },
];

const ADMIN_NAV_ITEMS = [
  { to: "/ops/admin/orgs", label: "Organizations", icon: Building2, end: false },
  { to: "/ops/admin/proposals", label: "Proposals", icon: FileText, end: false },
  { to: "/ops/admin/users", label: "Users", icon: UserCog, end: false },
];

function OpsLayoutInner() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/app/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-white/10 flex flex-col shrink-0">
        <div className="px-6 py-8">
          <Logo />
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-1">
          {STAFF_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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

          {profile?.role === "admin" && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 px-4 mt-6 mb-1">
                Admin
              </div>
              {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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
            </>
          )}
        </nav>
        <div className="px-4 py-6 border-t border-white/10">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{profile?.full_name ?? ""}</div>
              <div className="text-xs text-on-surface-variant truncate capitalize">{profile?.role}</div>
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
        <Outlet />
      </main>
    </div>
  );
}

export default function OpsLayout() {
  return (
    <RequireRole roles={["internal", "admin"]}>
      <OpsLayoutInner />
    </RequireRole>
  );
}
