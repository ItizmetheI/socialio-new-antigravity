import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import NavBar from "./NavBar";

export type NavItem = { to: string; label: string; end: boolean };
export type NavSection = { heading?: string; items: NavItem[] };

type Props = {
  sections: NavSection[];
  children: ReactNode;
};

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-3.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
    isActive ? "border-primary text-white font-bold" : "border-transparent text-on-surface-variant hover:text-white"
  }`;

// The dashboard lives inside the site: the normal top nav (with its
// signed-in-only "Dashboard" link), then a sticky tab row for the
// dashboard's own sections. Tabs scroll sideways on phones.
export default function DashboardShell({ sections, children }: Props) {
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
        <nav
          ref={tabsRef}
          aria-label="Dashboard sections"
          className="max-w-7xl mx-auto px-2 md:px-3 flex items-center overflow-x-auto no-scrollbar -mb-px max-lg:[mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]"
        >
          {sections.map((section, i) => (
            <div key={section.heading ?? i} className="flex items-center">
              {i > 0 && <span aria-hidden className="w-px h-4 bg-white/15 mx-3" />}
              {section.items.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} className={tabClass}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8 md:py-12">{children}</main>
    </div>
  );
}
