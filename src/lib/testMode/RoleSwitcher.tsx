import React from "react";
import { FlaskConical } from "lucide-react";
import { TEST_IDENTITIES, setStoredTestIdentityKey, type TestIdentityKey } from "./testAuth";

const OPTIONS: { key: TestIdentityKey; label: string; home: string }[] = [
  { key: "client-pending", label: "Client — pending proposal", home: "/app" },
  { key: "client-approved", label: "Client — approved & in progress", home: "/app" },
  { key: "internal", label: "Internal staff", home: "/ops" },
  { key: "admin", label: "Admin", home: "/ops" },
];

// Only mounted when VITE_TEST_MODE=true (see App.tsx). A full navigation
// (not react-router) on purpose — it forces AuthContext's mount effect to
// re-read the identity that was just written to localStorage.
export default function RoleSwitcher() {
  const goTo = (key: TestIdentityKey, home: string) => {
    setStoredTestIdentityKey(key);
    window.location.href = home;
  };

  const signOut = () => {
    setStoredTestIdentityKey(null);
    window.location.href = "/app/login";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-surface-container border border-amber-400/30 rounded-2xl shadow-2xl p-4 w-72">
      <div className="flex items-center gap-2 mb-3 text-amber-300">
        <FlaskConical className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Test mode</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {OPTIONS.map(({ key, label, home }) => (
          <button
            key={key}
            onClick={() => goTo(key, home)}
            className="text-left text-sm px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-colors"
          >
            {label}
          </button>
        ))}
        <button
          onClick={signOut}
          className="text-left text-sm px-3 py-2 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors mt-1 border-t border-white/10 pt-3"
        >
          Sign out
        </button>
      </div>
      <p className="text-[11px] text-on-surface-variant mt-3 leading-relaxed">
        {TEST_IDENTITIES["client-pending"].fullName} / {TEST_IDENTITIES["client-approved"].fullName} are fixture
        clients — no real Supabase project is connected.
      </p>
    </div>
  );
}
