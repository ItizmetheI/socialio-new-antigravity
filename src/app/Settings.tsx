import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import ErrorBanner from "../components/ErrorBanner";
import PageHeader from "../components/workspace/PageHeader";
import type { ClientOutletContext } from "./ClientLayout";

const MIN_PASSWORD_LENGTH = 8;

export default function Settings() {
  const { profile, session } = useAuth();
  const { orgName } = useOutletContext<ClientOutletContext>();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

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

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaved(false);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordError("");
    setIsSavingPassword(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsSavingPassword(false);
    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" description="Your account details and password." />

      <div className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="mb-6">
          <div className="field-label mb-1">Organization</div>
          <div className="text-white font-bold">{orgName || "—"}</div>
        </div>
        <div className="mb-6">
          <div className="field-label mb-1">Email</div>
          <div className="text-white font-bold break-all">{session?.user.email}</div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label htmlFor="settings-name" className="field-label">Full name</label>
            <input
              id="settings-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field"
            />
          </div>
          {error && <ErrorBanner message={error} />}
          {saved && <div className="text-primary text-sm">Saved.</div>}
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary self-start"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      <div className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 mt-6">
        <h2 className="font-bold text-white mb-6">Change password</h2>
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
          <div>
            <label htmlFor="settings-new-password" className="field-label">New password</label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="settings-confirm-password" className="field-label">Confirm password</label>
            <input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="field"
            />
          </div>
          {passwordError && <ErrorBanner message={passwordError} />}
          {passwordSaved && <div className="text-primary text-sm">Password updated.</div>}
          <button
            type="submit"
            disabled={isSavingPassword}
            className="btn-primary self-start"
          >
            {isSavingPassword ? "Saving..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
