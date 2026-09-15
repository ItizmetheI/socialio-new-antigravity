import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Spinner from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import { inviteUser } from "./inviteUser";
import type { Profile, UserRole } from "../../lib/database.types";

type LoadState = "loading" | "error" | "ready";
type StaffRole = Extract<UserRole, "internal" | "admin">;

export default function UsersAdmin() {
  const [state, setState] = useState<LoadState>("loading");
  const [staff, setStaff] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("internal");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const load = React.useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["internal", "admin"])
      .order("created_at", { ascending: false });
    if (error) {
      setState("error");
      return;
    }
    setStaff((data ?? []) as Profile[]);
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;

    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");

    const { error } = await inviteUser({ email, fullName, role });

    setIsInviting(false);
    if (error) {
      setInviteError(error.message);
      return;
    }

    setInviteSuccess(`Invite sent to ${email}.`);
    setEmail("");
    setFullName("");
    await load();
  };

  const toggleActive = async (member: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);
    if (!error) {
      setStaff((prev) => prev.map((p) => (p.id === member.id ? { ...p, is_active: !p.is_active } : p)));
    }
  };

  return (
    <div className="p-10 max-w-4xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Team</h1>

      <div className="bg-surface-container border border-white/10 rounded-3xl p-8 mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
          Invite a teammate
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@socialio.io"
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="internal">Internal</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {inviteError && <ErrorBanner message={inviteError} />}
          {inviteSuccess && <div className="text-primary text-sm">{inviteSuccess}</div>}

          <button
            type="submit"
            disabled={isInviting}
            className="self-start px-6 py-3 bg-white text-black hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            {isInviting ? "Sending..." : "Send invite"}
          </button>
        </form>
      </div>

      {state === "loading" && (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      )}
      {state === "error" && <ErrorBanner message="Couldn't load the team. Try refreshing." />}
      {state === "ready" && staff.length === 0 && (
        <EmptyState title="No teammates yet" description="Invite your first staff member above." />
      )}
      {state === "ready" && staff.length > 0 && (
        <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden">
          {staff.map((member, index) => (
            <div
              key={member.id}
              className={`flex items-center justify-between px-8 py-6 ${
                index !== staff.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div>
                <div className="font-bold text-white">{member.full_name ?? "—"}</div>
                <div className="text-xs text-on-surface-variant capitalize">{member.role}</div>
              </div>
              <button
                onClick={() => toggleActive(member)}
                className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border transition-colors ${
                  member.is_active
                    ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20 hover:bg-emerald-400/20"
                    : "bg-white/5 text-on-surface-variant border-white/10 hover:bg-white/10"
                }`}
              >
                {member.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
