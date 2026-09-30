import { useState } from "react";
import { ChevronDown, FlaskConical, RotateCcw } from "lucide-react";
import { getStoredTestIdentityKey, setStoredTestIdentityKey, type TestIdentityKey } from "./testAuth";

const OPTIONS: { key: TestIdentityKey; label: string; detail: string; home: string }[] = [
  { key: "client-pending", label: "New client", detail: "Just signed up, hasn't sent their brief", home: "/app" },
  { key: "client-approved", label: "Active client", detail: "Plan approved, work in progress, a piece to review", home: "/app" },
  { key: "internal", label: "Team member", detail: "Sees all clients and the work", home: "/ops" },
  { key: "admin", label: "Owner (admin)", detail: "Everything, plus money, accounts and team", home: "/ops" },
];

// Only mounted when VITE_TEST_MODE=true (see App.tsx): the demo build.
// Switching role is a full navigation on purpose — it re-reads the identity
// and resets the in-memory sample data, so every run of the demo starts
// from the same state. Collapsed to a small pill so it never covers the
// page (and sits above the phone tab bar).
export default function RoleSwitcher() {
  const current = getStoredTestIdentityKey();
  const [isOpen, setIsOpen] = useState(!current);
  const currentLabel = OPTIONS.find((o) => o.key === current)?.label ?? "Signed out";

  const goTo = (key: TestIdentityKey | null, home: string) => {
    setStoredTestIdentityKey(key);
    window.location.href = home;
  };

  return (
    <div className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-surface-container border border-amber-400/40 rounded-2xl shadow-2xl p-3 w-72 max-w-[calc(100vw-2rem)]" role="dialog" aria-label="Demo controls">
          <p className="text-xs text-on-surface-variant px-2 pt-1 pb-3 leading-relaxed">
            Demo with sample data. Nothing here touches real accounts. Pick who to view the portal as:
          </p>
          <div className="flex flex-col gap-1">
            {OPTIONS.map(({ key, label, detail, home }) => (
              <button
                key={key}
                type="button"
                onClick={() => goTo(key, home)}
                aria-current={current === key}
                className={`text-left px-3 py-2 rounded-lg transition-colors ${current === key ? "bg-amber-400/10" : "hover:bg-white/5"}`}
              >
                <span className="block text-sm font-bold text-white">{label}</span>
                <span className="block text-xs text-on-surface-variant">{detail}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset sample data
            </button>
            <button
              type="button"
              onClick={() => goTo(null, "/app/login")}
              className="flex-1 text-xs font-bold px-3 py-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-surface-container shadow-lg px-3.5 py-2 text-xs font-bold text-white"
      >
        <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
        Demo · {currentLabel}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}
