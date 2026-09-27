import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; end: boolean };
export type NavSection = { heading?: string; items: NavItem[] };

type Props = {
  sections: NavSection[];
  accountName: string;
  accountDetail: string;
  onSignOut: () => void;
  children: ReactNode;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
    isActive ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:text-white hover:bg-white/5"
  }`;

function NavContent({ sections, accountName, accountDetail, onSignOut }: Omit<Props, "children">) {
  return (
    <>
      <nav className="flex-1 px-4 flex flex-col gap-1">
        {sections.map((section, i) => (
          <div key={section.heading ?? i} className="flex flex-col gap-1">
            {section.heading && (
              <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 px-4 mt-6 mb-1">
                {section.heading}
              </div>
            )}
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-4 py-6 border-t border-white/10">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{accountName}</div>
            <div className="text-xs text-on-surface-variant truncate capitalize">{accountDetail}</div>
          </div>
          <ThemeToggle className="shrink-0" />
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

// Sidebar from md up; below that a top bar whose menu opens the same nav.
// The fixed 256px sidebar used to squeeze phone screens to ~120px of content.
export default function DashboardShell({ children, ...navProps }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setIsMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-background md:flex">
      <header className="md:hidden sticky top-0 z-40 bg-background border-b border-white/10">
        <div className="flex items-center justify-between px-5 py-3">
          <Logo />
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="p-2 rounded-lg text-white hover:bg-white/5 transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="border-t border-white/10 pt-3 max-h-[calc(100vh-64px)] overflow-y-auto flex flex-col">
            <NavContent {...navProps} />
          </div>
        )}
      </header>

      <aside className="hidden md:flex w-64 border-r border-white/10 flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-6 py-8">
          <Logo />
        </div>
        <NavContent {...navProps} />
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
