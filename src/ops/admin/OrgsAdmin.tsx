import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Spinner from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import { inviteUser } from "./inviteUser";
import type { Organization } from "../../lib/database.types";

type LoadState = "loading" | "error" | "ready";
type OrgTarget = "new" | string;

export default function OrgsAdmin() {
  const [state, setState] = useState<LoadState>("loading");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgTarget, setOrgTarget] = useState<OrgTarget>("new");
  const [newOrgName, setNewOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const load = React.useCallback(async () => {
    setState("loading");
    const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
    if (error) {
      setState("error");
      return;
    }
    setOrgs((data ?? []) as Organization[]);
    setState("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;
    if (orgTarget === "new" && !newOrgName) return;

    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");

    const { error } = await inviteUser({
      email,
      fullName,
      role: "client",
      ...(orgTarget === "new" ? { orgName: newOrgName } : { orgId: orgTarget }),
    });

    setIsInviting(false);
    if (error) {
      setInviteError(error.message);
      return;
    }

    setInviteSuccess(`Invite sent to ${email}.`);
    setEmail("");
    setFullName("");
    setNewOrgName("");
    setOrgTarget("new");
    await load();
  };

  return (
    <div className="p-10 max-w-4xl">
      <h1 className="hero-display font-bold text-3xl text-white mb-8">Organizations</h1>

      <div className="bg-surface-container border border-white/10 rounded-3xl p-8 mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
          Invite a client
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
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
                placeholder="Jane Doe"
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
              Organization
            </label>
            <select
              value={orgTarget}
              onChange={(e) => setOrgTarget(e.target.value)}
              className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors appearance-none mb-3"
            >
              <option value="new">+ New organization</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} (add teammate)
                </option>
              ))}
            </select>
            {orgTarget === "new" && (
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors"
              />
            )}
          </div>

          {inviteError && <ErrorBanner message={inviteError} />}
          {inviteSuccess && <div className="text-primary text-sm">{inviteSuccess}</div>}

          <button
            type="submit"
            disabled={isInviting}
            className="self-start px-6 py-3 bg-white text-background hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
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
      {state === "error" && <ErrorBanner message="Couldn't load organizations. Try refreshing." />}
      {state === "ready" && orgs.length === 0 && (
        <EmptyState title="No organizations yet" description="Invite your first client above to create one." />
      )}
      {state === "ready" && orgs.length > 0 && (
        <div className="bg-surface-container border border-white/10 rounded-3xl overflow-hidden">
          {orgs.map((org, index) => (
            <div
              key={org.id}
              className={`px-8 py-6 ${index !== orgs.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <div className="font-bold text-white">{org.name}</div>
              <div className="text-xs text-on-surface-variant">
                Created {new Date(org.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
