import React, { useState } from "react";
import ErrorBanner from "../../components/ErrorBanner";
import { inviteUser } from "./inviteUser";
import type { Organization } from "../../lib/database.types";

type OrgTarget = "new" | string;

// Invite a client: either a new organization or another person on an
// existing one. Admin only — the invite-client function checks that too.
export default function InviteClientForm({ orgs, onInvited }: { orgs: Organization[]; onInvited: () => void }) {
  const [orgTarget, setOrgTarget] = useState<OrgTarget>("new");
  const [newOrgName, setNewOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || (orgTarget === "new" && !newOrgName.trim())) {
      setInviteError("Fill in every field.");
      return;
    }
    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");
    const { error } = await inviteUser({
      email: email.trim(),
      fullName: fullName.trim(),
      role: "client",
      ...(orgTarget === "new" ? { orgName: newOrgName.trim() } : { orgId: orgTarget }),
    });
    setIsInviting(false);
    if (error) {
      setInviteError(error.message);
      return;
    }
    setInviteSuccess(`Invite sent to ${email.trim()}.`);
    setEmail("");
    setFullName("");
    setNewOrgName("");
    setOrgTarget("new");
    onInvited();
  };

  return (
    <form onSubmit={handleInvite} className="bg-surface-container border border-white/10 rounded-2xl p-5 md:p-6 mb-8 flex flex-col gap-4">
      <h2 className="font-bold text-white">Invite a client</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="invite-client-email" className="field-label">Email</label>
          <input id="invite-client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" className="field" />
        </div>
        <div>
          <label htmlFor="invite-client-name" className="field-label">Full name</label>
          <input id="invite-client-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="field" />
        </div>
        <div>
          <label htmlFor="invite-client-org" className="field-label">Business</label>
          <select id="invite-client-org" value={orgTarget} onChange={(e) => setOrgTarget(e.target.value)} className="field appearance-none">
            <option value="new">+ New business</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} (add a person)
              </option>
            ))}
          </select>
        </div>
      </div>
      {orgTarget === "new" && (
        <div>
          <label htmlFor="invite-client-new-org" className="field-label">Business name</label>
          <input id="invite-client-new-org" type="text" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="Northwind Coffee Co." className="field md:max-w-sm" />
        </div>
      )}
      {inviteError && <ErrorBanner message={inviteError} />}
      {inviteSuccess && <p className="text-sm text-emerald-300 light:text-emerald-700" role="status">{inviteSuccess}</p>}
      <button type="submit" disabled={isInviting} className="btn-primary self-start">
        {isInviting ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
