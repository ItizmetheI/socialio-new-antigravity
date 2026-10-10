import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Lock, Plus, ShieldAlert } from "lucide-react";
import PasswordInput from "../components/PasswordInput";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/AuthContext";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import SocialLoginForm, { SOCIAL_STATUS, platformLabel } from "../components/SocialLoginForm";
import { SOCIAL_LOGIN_COLUMNS } from "../app/SocialLoginsSection";
import { readFunctionError } from "../lib/functionError";
import { timeAgo } from "../lib/format";
import type { SocialLogin, SocialLoginEvent } from "../lib/database.types";

const REVEAL_SECONDS = 60;

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

// Client hub "Access" section: the client's social logins. Passwords stay
// encrypted until a team member presses Show, which first needs their own
// password (vault open 10 minutes); every view is logged and hides after a
// minute. Admins also see the access log and any failed unlocks or blocks.
export default function ClientAccess({ orgId }: { orgId: string }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [logins, setLogins] = useState<SocialLogin[] | null>(null);
  const [events, setEvents] = useState<SocialLoginEvent[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [revealed, setRevealed] = useState<Record<string, { password: string; notes: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [unlockFor, setUnlockFor] = useState<string | null>(null);
  const [myPassword, setMyPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [alerts, setAlerts] = useState<SocialLoginEvent[]>([]);

  const load = useCallback(async () => {
    const [loginsRes, eventsRes] = await Promise.all([
      supabase.from("social_logins").select(SOCIAL_LOGIN_COLUMNS).eq("org_id", orgId).order("created_at"),
      isAdmin
        ? supabase.from("social_login_events").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(15)
        : Promise.resolve({ data: [], error: null }),
    ]);
    let warnRows: SocialLoginEvent[] = [];
    if (isAdmin) {
      const { data: warn } = await supabase
        .from("social_login_events")
        .select("*")
        .in("action", ["unlock_failed", "blocked"])
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10);
      warnRows = (warn ?? []) as SocialLoginEvent[];
      setAlerts(warnRows);
    }
    if (loginsRes.error) {
      setError("Couldn't load this client's logins.");
      return;
    }
    const rows = (loginsRes.data ?? []) as SocialLogin[];
    const evs = (eventsRes.data ?? []) as SocialLoginEvent[];
    setLogins(rows);
    setEvents(evs);
    const ids = [...new Set([...rows.map((r) => r.last_revealed_by), ...evs.map((e) => e.actor_id), ...warnRows.map((e) => e.actor_id)].filter(Boolean))] as string[];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(new Map((data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Someone"])));
    }
  }, [orgId, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (body: Record<string, unknown>, onLocked?: () => void) => {
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke<Record<string, unknown> & { error?: string }>("social-access", { body });
    if (invokeError || !data || data.error) {
      const { message, code } = await readFunctionError(invokeError, data, "Something went wrong.");
      if (code === "vault_locked" && onLocked) onLocked();
      else setError(message);
      return null;
    }
    return data;
  };

  const reveal = async (id: string) => {
    setBusyId(id);
    const data = await call({ action: "reveal", id }, () => setUnlockFor(id));
    setBusyId(null);
    if (!data) return;
    setRevealed((r) => ({ ...r, [id]: { password: String(data.password ?? ""), notes: String(data.notes ?? "") } }));
    setTimeout(() => setRevealed(({ [id]: _gone, ...rest }) => rest), REVEAL_SECONDS * 1000);
    load();
  };

  // Step-up: re-enter your own password; the vault stays open 10 minutes.
  const unlockAndReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockFor) return;
    setIsUnlocking(true);
    const data = await call({ action: "unlock", password: myPassword });
    setIsUnlocking(false);
    setMyPassword("");
    if (!data) return;
    const id = unlockFor;
    setUnlockFor(null);
    reveal(id);
  };

  const setStatus = async (id: string, status: SocialLogin["status"], statusNote?: string) => {
    setBusyId(id);
    const data = await call({ action: "set_status", id, status, note: statusNote });
    setBusyId(null);
    if (data) {
      setNoteFor(null);
      setNote("");
      load();
    }
  };

  if (!logins) {
    return error ? (
      <ErrorBanner message={error} />
    ) : (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {logins.length === 0 && !isAdding && (
        <EmptyState title="No logins yet" description="The client adds them under Account → Social accounts. You can also add one they gave you on a call." />
      )}

      {logins.map((login) => {
        const shown = revealed[login.id];
        const viewer = login.last_revealed_by ? names.get(login.last_revealed_by) : null;
        return (
          <div key={login.id} className="bg-surface-container border border-white/10 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-bold">
                  {login.platform === "other" && login.label ? login.label : platformLabel(login.platform)}
                  {login.platform !== "other" && login.label && <span className="text-on-surface-variant font-normal"> · {login.label}</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="break-all">{login.username}</span>
                  <button type="button" onClick={() => copy(login.username)} aria-label="Copy username" className="hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {login.last_revealed_at && (
                  <div className="text-xs text-on-surface-variant mt-1">Last opened by {viewer ?? "a team member"} {timeAgo(login.last_revealed_at)}</div>
                )}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${SOCIAL_STATUS[login.status].cls}`}>
                {login.status === "submitted" ? "New · not checked yet" : SOCIAL_STATUS[login.status].label}
              </span>
            </div>

            {shown ? (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-on-surface-variant">Password</span>
                  <code className="text-white font-bold break-all">{shown.password}</code>
                  <button type="button" onClick={() => copy(shown.password)} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button type="button" onClick={() => setRevealed(({ [login.id]: _x, ...rest }) => rest)} className="inline-flex items-center gap-1 text-on-surface-variant hover:text-white ml-auto">
                    <EyeOff className="w-3.5 h-3.5" /> Hide
                  </button>
                </div>
                {shown.notes && <p className="mt-2 text-on-surface whitespace-pre-wrap">{shown.notes}</p>}
                <p className="mt-2 text-xs text-on-surface-variant">Hides itself after a minute. This view was logged.</p>
              </div>
            ) : null}

            {unlockFor === login.id && (
              <form onSubmit={unlockAndReveal} className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
                <p className="flex gap-2 text-sm text-white">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                  Confirm it's you. Enter your own Socialio password to open client passwords for 10 minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <PasswordInput
                      aria-label="Your Socialio password"
                      autoComplete="current-password"
                      value={myPassword}
                      onChange={(e) => setMyPassword(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button type="submit" disabled={isUnlocking || !myPassword} className="btn-primary px-4 py-2 text-sm">
                    {isUnlocking ? "Checking..." : "Unlock"}
                  </button>
                  <button type="button" onClick={() => setUnlockFor(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                </div>
              </form>
            )}

            {unlockFor === login.id ? null : noteFor === login.id ? (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="What went wrong? The client sees this, e.g. Wrong password or the login code went to your phone"
                  className="field flex-1"
                  aria-label="What went wrong"
                />
                <button type="button" disabled={busyId === login.id} onClick={() => setStatus(login.id, "not_working", note)} className="btn-primary px-4 py-2 text-sm">
                  Tell the client
                </button>
                <button type="button" onClick={() => setNoteFor(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {!shown && (
                  <button type="button" disabled={busyId === login.id} onClick={() => reveal(login.id)} className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
                    <Eye className="w-4 h-4" /> {busyId === login.id ? "Opening..." : "Show password"}
                  </button>
                )}
                {login.status !== "working" && (
                  <button type="button" disabled={busyId === login.id} onClick={() => setStatus(login.id, "working")} className="text-emerald-600 hover:underline">
                    It works
                  </button>
                )}
                {login.status !== "not_working" && (
                  <button type="button" onClick={() => setNoteFor(login.id)} className="text-red-500 hover:underline">
                    Doesn't work
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {error && <ErrorBanner message={error} />}

      {isAdding ? (
        <div className="bg-surface-container border border-white/10 rounded-2xl p-5 md:p-6">
          <SocialLoginForm
            orgId={orgId}
            onSaved={() => {
              setIsAdding(false);
              load();
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="btn-secondary self-start px-4 py-2 text-sm">
          <Plus className="w-4 h-4" /> Add a login for them
        </button>
      )}

      {isAdmin && alerts.length > 0 && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-red-500 mb-2">
            <ShieldAlert className="w-4 h-4" /> Vault warnings, last 7 days (all clients)
          </div>
          <ul className="text-sm flex flex-col gap-1">
            {alerts.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2">
                <span className="text-white">
                  <strong>{(e.actor_id && names.get(e.actor_id)) || "Someone"}</strong>{" "}
                  {e.action === "unlock_failed" ? "entered a wrong password to unlock" : `was blocked: ${e.detail ?? ""}`}
                  {e.ip && <span className="text-on-surface-variant"> · {e.ip}</span>}
                </span>
                <span className="text-on-surface-variant text-xs">{timeAgo(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && events.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold text-on-surface-variant mb-2">Access log (admins only)</div>
          <ul className="text-sm divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                <span className="text-white">
                  <strong>{(e.actor_id && names.get(e.actor_id)) || "Someone"}</strong> {e.action === "revealed" ? "opened" : e.action === "status" ? "marked" : e.action} <span className="text-on-surface-variant">{e.detail}{e.ip ? ` · ${e.ip}` : ""}</span>
                </span>
                <span className="text-on-surface-variant text-xs">{timeAgo(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
