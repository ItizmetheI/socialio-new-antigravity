import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import NavBar from "./NavBar";

export type NavItem = { to: string; label: string; end: boolean; icon: LucideIcon };

type Props = {
  items: NavItem[];
  children: ReactNode;
};

const topTabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 px-3 py-3.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
    isActive ? "border-primary text-white font-bold" : "border-transparent text-on-surface-variant hover:text-white"
  }`;

const bottomTabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors ${
    isActive ? "text-primary font-bold" : "text-on-surface-variant"
  }`;

// The dashboard lives inside the site: the normal top nav, then the
// dashboard's own sections — a sticky tab row on tablets and up, and an
// app-style bottom bar on phones (thumb-reachable, like the future app).
// Kept to 5 sections max so the bottom bar never crowds.
export default function DashboardShell({ items, children }: Props) {
  return (
    <div className="min-h-screen bg-background pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <NavBar />
      <div className="mt-20">
        <div className="hidden md:block sticky top-20 z-30 bg-background/95 backdrop-blur-md border-b border-white/10">
          <nav aria-label="Dashboard sections" className="max-w-7xl mx-auto px-3 flex items-center gap-1 -mb-px">
            {items.map(({ to, label, end, icon: Icon }) => (
              <NavLink key={to} to={to} end={end} className={topTabClass}>
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 md:py-12">{children}</main>
      </div>

      <nav
        aria-label="Dashboard sections"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map(({ to, label, end, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={bottomTabClass}>
              <Icon className="w-5 h-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
