import { useState } from "react";
import PasswordInput from "./PasswordInput";
import ErrorBanner from "./ErrorBanner";
import { supabase } from "../lib/supabase";
import { readFunctionError } from "../lib/functionError";
import { PLATFORMS, type SocialLogin, type SocialLoginStatus, type SocialPlatform } from "../lib/database.types";

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [...PLATFORMS, { value: "other", label: "Other" }];
export const platformLabel = (p: SocialPlatform) => SOCIAL_PLATFORMS.find((x) => x.value === p)?.label ?? p;

export const SOCIAL_STATUS: Record<SocialLoginStatus, { label: string; cls: string }> = {
  submitted: { label: "Saved · team checking", cls: "text-amber-600 bg-amber-400/10 border-amber-400/20" },
  working: { label: "Working", cls: "text-emerald-600 bg-emerald-400/10 border-emerald-400/20" },
  not_working: { label: "Not working", cls: "text-red-500 bg-red-400/10 border-red-400/20" },
};

type Props = {
  existing?: SocialLogin; // editing: the password can be left blank to keep it
  orgId?: string; // staff adding for a client
  onSaved: () => void;
  onCancel?: () => void;
};

// Add or update one social login. The password goes straight to the
// social-access function, which encrypts it; it's never stored readable and
// never shown back here.
export default function SocialLoginForm({ existing, orgId, onSaved, onCancel }: Props) {
  const [platform, setPlatform] = useState<SocialPlatform>(existing?.platform ?? "instagram");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const idPrefix = existing ? `social-${existing.id}` : "social-new";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!existing && !password) {
      setError("Enter the password.");
      return;
    }
    setIsSaving(true);
    const { data, error: invokeError } = await supabase.functions.invoke<{ id?: string; error?: string }>("social-access", {
      body: {
        action: "save",
        id: existing?.id,
        orgId,
        platform,
        label: label.trim() || null,
        username,
        password,
        // Editing with the notes box left empty keeps the saved notes.
        notes: existing && !notes.trim() ? undefined : notes,
      },
    });
    setIsSaving(false);
    if (invokeError || !data || data.error) {
      const { message, status } = await readFunctionError(invokeError, data, "Couldn't save.");
      setError(status !== undefined && status < 500 ? message : "Couldn't save right now. Try again in a minute.");
      return;
    }
    setPassword("");
    setNotes("");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" autoComplete="off">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-platform`} className="field-label">Platform</label>
          <select id={`${idPrefix}-platform`} value={platform} onChange={(e) => setPlatform(e.target.value as SocialPlatform)} className="field">
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-label`} className="field-label">{platform === "other" ? "Which platform?" : "Account name (optional)"}</label>
          <input
            id={`${idPrefix}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder={platform === "other" ? "e.g. Pinterest" : "e.g. Main store account"}
            className="field"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-username`} className="field-label">Username or email</label>
          <input
            id={`${idPrefix}-username`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={200}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-password`} className="field-label">{existing ? "New password (leave empty to keep)" : "Password"}</label>
          <PasswordInput
            id={`${idPrefix}-password`}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-notes`} className="field-label">Login codes / notes (optional)</label>
        <textarea
          id={`${idPrefix}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder={existing ? "Leave empty to keep what you saved before" : "e.g. Login codes go to my phone, text me at 555-0134 when you sign in"}
          className="field"
        />
      </div>
      {error && <ErrorBanner message={error} />}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSaving} className="btn-primary px-4 py-2 text-sm">
          {isSaving ? "Saving..." : existing ? "Save changes" : "Save login"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
