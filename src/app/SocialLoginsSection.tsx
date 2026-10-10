import { useCallback, useEffect, useState } from "react";
import { Lock, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import SocialLoginForm, { SOCIAL_STATUS, platformLabel } from "../components/SocialLoginForm";
import { formatDate } from "../lib/format";
import type { SocialLogin } from "../lib/database.types";

export const SOCIAL_LOGIN_COLUMNS = "id, org_id, platform, label, username, status, status_note, created_by, created_at, updated_at, last_revealed_at, last_revealed_by";

// Account page section: the logins we need to post for them. The password
// is encrypted on save and never comes back to the browser.
export default function SocialLoginsSection({ orgId }: { orgId: string }) {
  const [logins, setLogins] = useState<SocialLogin[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("social_logins").select(SOCIAL_LOGIN_COLUMNS).eq("org_id", orgId).order("created_at");
    if (error) {
      setLoadError("Couldn't load your accounts. Try refreshing.");
      return;
    }
    setLogins((data ?? []) as SocialLogin[]);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    setActionError("");
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("social-access", { body: { action: "remove", id } });
    setRemovingId(null);
    if (error || !data?.ok) {
      setActionError("Couldn't remove it right now. Try again in a minute.");
      return;
    }
    load();
  };

  if (loadError) return <ErrorBanner message={loadError} />;
  if (!logins) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex gap-2 text-sm text-on-surface-variant max-w-2xl">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
        <span>
          Add the logins for the accounts we post on. They're encrypted the moment you save, only the Socialio team can open them, and every
          time someone does it's logged. Nothing goes out without your approval first.
        </span>
      </p>

      {logins.map((login) =>
        editingId === login.id ? (
          <div key={login.id} className="bg-surface-container border border-white/10 rounded-2xl p-5 md:p-6">
            <SocialLoginForm
              existing={login}
              onSaved={() => {
                setEditingId(null);
                load();
              }}
              onCancel={() => setEditingId(null)}
            />
          </div>
        ) : (
          <div key={login.id} className="bg-surface-container border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white font-bold">
                {login.platform === "other" && login.label ? login.label : platformLabel(login.platform)}
                {login.platform !== "other" && login.label && <span className="text-on-surface-variant font-normal"> · {login.label}</span>}
              </div>
              <div className="text-sm text-on-surface-variant break-all">{login.username} · password saved {formatDate(login.updated_at)}</div>
              {login.status === "not_working" && login.status_note && <div className="text-sm text-red-500 mt-1">{login.status_note}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${SOCIAL_STATUS[login.status].cls}`}>{SOCIAL_STATUS[login.status].label}</span>
              {removingId === login.id ? (
                <>
                  <span className="text-sm text-on-surface-variant">Remove this login?</span>
                  <button type="button" onClick={() => remove(login.id)} className="text-sm font-bold text-red-500 hover:underline">Remove</button>
                  <button type="button" onClick={() => setRemovingId(null)} className="text-sm text-on-surface-variant hover:underline">Keep</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setEditingId(login.id)} className="text-sm text-primary hover:underline">Update</button>
                  <button type="button" onClick={() => setRemovingId(login.id)} className="text-sm text-on-surface-variant hover:underline">Remove</button>
                </>
              )}
            </div>
          </div>
        ),
      )}

      {actionError && <ErrorBanner message={actionError} />}

      {editingId === "new" ? (
        <div className="bg-surface-container border border-white/10 rounded-2xl p-5 md:p-6">
          <SocialLoginForm
            onSaved={() => {
              setEditingId(null);
              load();
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setEditingId("new")} className="btn-secondary self-start px-4 py-2 text-sm">
          <Plus className="w-4 h-4" /> {logins.length ? "Add another account" : "Add an account"}
        </button>
      )}
    </div>
  );
}
