import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import NavBar from "./NavBar";

export type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; end: boolean };
export type NavSection = { heading?: string; items: NavItem[] };

type Props = {
  sections: NavSection[];
  // Shown left of the tabs: the client's business name, or "Studio" for staff.
  workspaceName: string;
  workspaceDetail?: string;
  children: ReactNode;
};

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-2 px-3 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
    isActive ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-white"
  }`;

// The dashboard lives inside the site: the normal top nav (with its
// signed-in-only "Dashboard" link), then a sticky tab row for the
// dashboard's own sections. Tabs scroll sideways on phones.
export default function DashboardShell({ sections, workspaceName, workspaceDetail, children }: Props) {
  const tabsRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // On phones the tab row scrolls; keep the current tab in view.
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="sticky top-20 z-30 bg-background/95 backdrop-blur-md border-b border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-5 md:px-6 flex items-center gap-6">
          <div className="hidden lg:block min-w-0 shrink-0 max-w-[14rem] py-3">
            <div className="text-sm font-bold text-white truncate">{workspaceName || "…"}</div>
            {workspaceDetail && <div className="text-xs text-on-surface-variant truncate">{workspaceDetail}</div>}
          </div>
          <nav ref={tabsRef} aria-label="Dashboard sections" className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px min-w-0">
            {sections.map((section, i) => (
              <div key={section.heading ?? i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden className="w-px h-5 bg-white/10 mx-2" />}
                {section.heading && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mr-1">{section.heading}</span>
                )}
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={tabClass}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </div>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
