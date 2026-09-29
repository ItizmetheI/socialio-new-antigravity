import { useState } from "react";
import { Link } from "react-router-dom";
import type { Organization } from "../../../lib/database.types";
import type { TimelineEntry } from "./loadEverything";
import { dayHeading } from "./when";

const TYPES: { key: TimelineEntry["type"] | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "account", label: "Accounts" },
  { key: "checkout", label: "Checkouts" },
  { key: "money", label: "Payments" },
  { key: "work", label: "Work" },
  { key: "plan", label: "Plans" },
  { key: "onboarding", label: "Onboarding" },
  { key: "lead", label: "Leads" },
];

const TYPE_LABEL: Record<TimelineEntry["type"], string> = {
  account: "Account",
  checkout: "Checkout",
  money: "Payment",
  work: "Work",
  plan: "Plan",
  onboarding: "Onboarding",
  lead: "Lead",
};

const PAGE = 100;

export default function TimelineView({ entries, orgs }: { entries: TimelineEntry[]; orgs: Organization[] }) {
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("all");
  const [orgId, setOrgId] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const q = query.trim().toLowerCase();

  const filtered = entries.filter(
    (e) =>
      (type === "all" || e.type === type) &&
      (orgId === "all" || e.orgId === orgId) &&
      (!q || `${e.text} ${e.orgId ? orgName.get(e.orgId) ?? "" : ""}`.toLowerCase().includes(q)),
  );
  const shown = filtered.slice(0, limit);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter by type">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            aria-pressed={type === t.key}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              type === t.key ? "border-primary text-white font-bold" : "border-white/10 text-on-surface-variant hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} aria-label="Filter by client" className="field sm:max-w-xs">
          <option value="all">All clients</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search what happened"
          aria-label="Search the timeline"
          className="field sm:max-w-sm"
        />
      </div>

      <p className="text-xs text-on-surface-variant mb-4">
        {filtered.length} event{filtered.length === 1 ? "" : "s"}
      </p>
      {shown.length === 0 && <p className="text-sm text-on-surface-variant">Nothing matches these filters.</p>}
      <ol>
        {shown.map((e, i) => {
          const day = dayHeading(e.at);
          const isNewDay = i === 0 || dayHeading(shown[i - 1].at) !== day;
          return (
            <li key={e.id}>
              {isNewDay && <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wide pt-6 pb-2 first:pt-0">{day}</h3>}
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_6.5rem_minmax(0,1fr)] gap-x-3 py-2.5 border-t border-white/10">
                <time dateTime={e.at} className="text-xs text-on-surface-variant pt-0.5 tabular-nums">
                  {new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </time>
                <span className="hidden sm:block text-xs text-on-surface-variant pt-0.5">{TYPE_LABEL[e.type]}</span>
                <div className="min-w-0">
                  <p className="text-sm text-white break-words">
                    {e.link ? (
                      <Link to={e.link} className="hover:text-primary">
                        {e.text}
                      </Link>
                    ) : (
                      e.text
                    )}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    <span className="sm:hidden">{TYPE_LABEL[e.type]} · </span>
                    {e.orgId ? (
                      <Link to={`/ops/clients/${e.orgId}`} className="hover:text-white">
                        {orgName.get(e.orgId) ?? "Unknown client"}
                      </Link>
                    ) : e.type === "lead" ? (
                      "Website visitor"
                    ) : (
                      "Socialio team"
                    )}
                    {e.isInternal && " · internal note"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {filtered.length > shown.length && (
        <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="btn-secondary mt-6 px-5 py-2.5">
          Show {Math.min(PAGE, filtered.length - shown.length)} more
        </button>
      )}
    </div>
  );
}
