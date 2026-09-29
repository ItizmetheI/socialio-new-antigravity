import { useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../../../lib/format";
import type { Organization } from "../../../lib/database.types";
import type { DirectoryUser } from "./loadEverything";
import { fullWhen } from "./when";

const ROLE_LABEL: Record<string, string> = { client: "Client", internal: "Team", admin: "Admin" };

export default function AccountsView({ users, orgs }: { users: DirectoryUser[]; orgs: Organization[] }) {
  const [query, setQuery] = useState("");
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const q = query.trim().toLowerCase();
  const shown = q
    ? users.filter((u) => `${u.full_name ?? ""} ${u.email ?? ""} ${u.org_id ? orgName.get(u.org_id) ?? "" : ""}`.toLowerCase().includes(q))
    : users;
  const unconfirmed = users.filter((u) => !u.email_confirmed_at).length;
  const neverSignedIn = users.filter((u) => !u.last_sign_in_at).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or client"
          aria-label="Search accounts"
          className="field w-full sm:max-w-sm"
        />
        <p className="text-xs text-on-surface-variant">
          {users.length} accounts · {unconfirmed} unconfirmed · {neverSignedIn} never signed in
        </p>
      </div>

      <div className="hidden lg:grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.6fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)] gap-4 text-xs text-on-surface-variant pb-2 border-b border-white/10">
        <span>Person</span>
        <span>Role</span>
        <span>Client</span>
        <span>Joined</span>
        <span>Last sign-in</span>
        <span>Signs in with</span>
      </div>
      {shown.length === 0 && <p className="text-sm text-on-surface-variant py-6">No accounts match.</p>}
      <ul className="divide-y divide-white/10 border-b border-white/10">
        {shown.map((u) => (
          <li
            key={u.id}
            className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.6fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)] gap-x-4 gap-y-1 py-3 text-sm"
          >
            <span className="col-span-2 lg:col-span-1 min-w-0">
              <span className="block font-bold text-white truncate">
                {u.full_name || "No name"}
                {!u.is_active && <span className="text-error font-normal"> · deactivated</span>}
              </span>
              <span className="block text-xs text-on-surface-variant truncate">
                {u.email}
                {!u.email_confirmed_at && <span className="text-amber-300 light:text-amber-700"> · not confirmed</span>}
              </span>
            </span>
            <span className="text-xs lg:text-sm text-on-surface-variant lg:text-white">{ROLE_LABEL[u.role] ?? u.role}</span>
            <span className="text-xs lg:text-sm text-on-surface-variant lg:text-white truncate">
              {u.org_id ? (
                <Link to={`/ops/clients/${u.org_id}`} className="hover:text-primary">
                  {orgName.get(u.org_id) ?? "Unknown client"}
                </Link>
              ) : (
                "—"
              )}
            </span>
            <span className="text-xs lg:text-sm text-on-surface-variant lg:text-white" title={fullWhen(u.created_at)}>
              <span className="lg:hidden">Joined </span>
              {new Date(u.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </span>
            <span className="text-xs lg:text-sm text-on-surface-variant lg:text-white" title={u.last_sign_in_at ? fullWhen(u.last_sign_in_at) : undefined}>
              {u.last_sign_in_at ? `Signed in ${timeAgo(u.last_sign_in_at)}` : "Never signed in"}
            </span>
            <span className="text-xs lg:text-sm text-on-surface-variant lg:text-white capitalize">{u.providers.join(", ") || "email"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
