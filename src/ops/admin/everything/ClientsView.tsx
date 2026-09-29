import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import LedgerLines from "../../../components/workspace/LedgerLines";
import { formatCents, formatDate, timeAgo } from "../../../lib/format";
import type { ClientSummary } from "./loadEverything";
import { fullWhen } from "./when";

const ORG_STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-400 light:text-emerald-700",
  prospect: "text-amber-300 light:text-amber-700",
  paused: "text-on-surface-variant",
  canceled: "text-error",
};

const ONBOARDING_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted, needs review",
  reviewed: "Reviewed",
};

const PLAN_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent, waiting on client",
  viewed: "Viewed by client",
  changes_requested: "Client asked for changes",
  approved: "Approved",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="text-sm text-white mt-0.5 break-words">{children}</dd>
    </div>
  );
}

function ClientDetails({ c }: { c: ClientSummary }) {
  const answers = c.onboarding?.answers ?? {};
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-x-10 gap-y-8 pt-2 pb-8">
      <section className="min-w-0">
        <h3 className="text-sm font-bold text-white mb-3">What they bought and what's left</h3>
        {c.ledger.length > 0 ? (
          <LedgerLines lines={c.ledger} />
        ) : (
          <p className="text-sm text-on-surface-variant">
            Nothing paid yet{c.pendingCheckouts > 0 && ` · ${c.pendingCheckouts} checkout${c.pendingCheckouts > 1 ? "s" : ""} started but not paid`}.
          </p>
        )}

        <h3 className="text-sm font-bold text-white mt-8 mb-3">History</h3>
        {c.history.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nothing recorded yet.</p>
        ) : (
          <ol className="border-l border-white/10 ml-1">
            {c.history.slice(0, 15).map((h) => (
              <li key={h.id} className="relative pl-4 pb-3 last:pb-0">
                <span aria-hidden className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full bg-white/30" />
                <p className="text-sm text-white">
                  {h.link ? (
                    <Link to={h.link} className="hover:text-primary">
                      {h.text}
                    </Link>
                  ) : (
                    h.text
                  )}
                  {h.isInternal && <span className="text-xs text-on-surface-variant"> · internal</span>}
                </p>
                <p className="text-xs text-on-surface-variant">{fullWhen(h.at)}</p>
              </li>
            ))}
          </ol>
        )}
        {c.history.length > 15 && <p className="text-xs text-on-surface-variant mt-2">{c.history.length - 15} older events in the Timeline tab.</p>}
      </section>

      <section className="min-w-0">
        <h3 className="text-sm font-bold text-white mb-3">People</h3>
        {c.people.length === 0 ? (
          <p className="text-sm text-on-surface-variant mb-6">No one has an account on this client yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10 mb-8">
            {c.people.map((p) => (
              <li key={p.id} className="py-2.5">
                <p className="text-sm text-white font-bold truncate">
                  {p.full_name || "No name"}
                  {!p.is_active && <span className="text-error font-normal"> · deactivated</span>}
                </p>
                <p className="text-xs text-on-surface-variant truncate">{p.email}</p>
                <p className="text-xs text-on-surface-variant">
                  {p.last_sign_in_at ? `Last signed in ${timeAgo(p.last_sign_in_at)}` : "Never signed in"}
                  {!p.email_confirmed_at && " · email not confirmed"}
                </p>
              </li>
            ))}
          </ul>
        )}

        <h3 className="text-sm font-bold text-white mb-3">Brief</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <Fact label="Onboarding">{ONBOARDING_LABEL[c.onboarding?.status ?? "not_started"]}</Fact>
          <Fact label="Brand kit">{c.hasBrandKit ? "Filled in" : "Not yet"}</Fact>
          <Fact label="Plan">{c.plan ? `v${c.plan.version} · ${PLAN_LABEL[c.plan.status] ?? c.plan.status}` : "None yet"}</Fact>
          <Fact label="Files delivered">{c.files}</Fact>
          {answers.platforms?.length ? <Fact label="Platforms">{answers.platforms.join(", ")}</Fact> : null}
          {answers.existing_handles ? <Fact label="Handles">{answers.existing_handles}</Fact> : null}
        </dl>
        {answers.goals && <Fact label="Goals">{answers.goals}</Fact>}
        {answers.target_audience && (
          <div className="mt-3">
            <Fact label="Audience">{answers.target_audience}</Fact>
          </div>
        )}

        <Link to={`/ops/clients/${c.org.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary mt-6">
          Open the full client page <ArrowUpRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}

export default function ClientsView({ clients }: { clients: ClientSummary[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? clients.filter((c) => [c.org.name, ...c.people.map((p) => `${p.full_name ?? ""} ${p.email ?? ""}`)].join(" ").toLowerCase().includes(q))
    : clients;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search clients, people or emails"
        aria-label="Search clients"
        className="field w-full sm:max-w-sm mb-6"
      />
      <div className="hidden lg:grid grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))_1.5rem] gap-4 text-xs text-on-surface-variant pb-2 border-b border-white/10">
        <span>Client</span>
        <span>Paid to date</span>
        <span>Delivered this period</span>
        <span>Open now</span>
        <span>Onboarding</span>
        <span>Last seen</span>
        <span />
      </div>
      {shown.length === 0 && <p className="text-sm text-on-surface-variant py-6">No clients match.</p>}
      <ul className="divide-y divide-white/10 border-b border-white/10">
        {shown.map((c) => {
          const isOpen = openId === c.org.id;
          return (
            <li key={c.org.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : c.org.id)}
                aria-expanded={isOpen}
                className="w-full text-left grid grid-cols-[minmax(0,1fr)_1.5rem] lg:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))_1.5rem] gap-x-4 gap-y-1 py-4 items-center group"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-white truncate group-hover:text-primary transition-colors">{c.org.name}</span>
                  <span className="block text-xs">
                    <span className={ORG_STATUS_STYLE[c.org.status] ?? ""}>{c.org.status}</span>
                    <span className="text-on-surface-variant"> · since {formatDate(c.org.created_at)}</span>
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={`w-4 h-4 text-on-surface-variant justify-self-end lg:order-last transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
                <span className="col-span-2 lg:col-span-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant lg:contents">
                  <span className="lg:text-sm lg:text-white">
                    <span className="lg:hidden">Paid </span>
                    {formatCents(c.paidCents)}
                    {c.mrrCents > 0 && <span className="text-on-surface-variant text-xs"> · {formatCents(c.mrrCents)}/mo</span>}
                  </span>
                  <span className="lg:text-sm lg:text-white">
                    {(c.unitsBought > 0 || c.deliveredWork > 0) && <span className="lg:hidden">Delivered </span>}
                    {c.unitsBought > 0 ? `${c.unitsDelivered} of ${c.unitsBought} pieces` : c.deliveredWork > 0 ? `${c.deliveredWork} requests` : "Nothing bought yet"}
                    {c.unitsRemaining > 0 && <span className="text-on-surface-variant text-xs"> · {c.unitsRemaining} left</span>}
                  </span>
                  <span className="lg:text-sm lg:text-white">
                    {c.openWork} open
                    {c.inReview > 0 && <span className="text-primary text-xs"> · {c.inReview} in review</span>}
                  </span>
                  <span className="lg:text-sm lg:text-white">{ONBOARDING_LABEL[c.onboarding?.status ?? "not_started"]}</span>
                  <span className="lg:text-sm lg:text-white">{c.lastSignIn ? `Seen ${timeAgo(c.lastSignIn)}` : "Never signed in"}</span>
                </span>
              </button>
              {isOpen && <ClientDetails c={c} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
