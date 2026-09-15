import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import ErrorBanner from "../components/ErrorBanner";
import type { ClientOutletContext } from "./ClientLayout";

export default function Settings() {
  const { profile, session } = useAuth();
  const { orgName } = useOutletContext<ClientOutletContext>();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setError("");
    setSaved(false);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);
    setIsSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="p-10 max-w-xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Settings</h1>

      <div className="bg-surface-container border border-white/10 rounded-3xl p-8">
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Organization
          </div>
          <div className="text-white font-bold">{orgName || "—"}</div>
        </div>
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email</div>
          <div className="text-white font-bold">{session?.user.email}</div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && <ErrorBanner message={error} />}
          {saved && <div className="text-primary text-sm">Saved.</div>}
          <button
            type="submit"
            disabled={isSaving}
            className="self-start px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
