import { Search } from "lucide-react";
import { CONTENT_FORMATS, PLATFORMS } from "../../lib/database.types";
import type { ContentFormat, Platform } from "../../lib/database.types";
import type { RequestFilters } from "./requestMeta";

type Props = {
  value: RequestFilters;
  onChange: (next: RequestFilters) => void;
  // Staff only: filter by client.
  orgs?: { id: string; name: string }[];
};

const selectClass =
  "bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors";

export default function RequestFilterBar({ value, onChange, orgs }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-8">
      <label className="relative flex-1">
        <span className="sr-only">Search</span>
        <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search titles and briefs"
          className={`${selectClass} w-full pl-9`}
        />
      </label>
      <div className="grid grid-cols-2 md:flex gap-3">
        {orgs && (
          <select aria-label="Client" value={value.orgId} onChange={(e) => onChange({ ...value, orgId: e.target.value })} className={`${selectClass} col-span-2`}>
            <option value="">All clients</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <select aria-label="Format" value={value.format} onChange={(e) => onChange({ ...value, format: e.target.value as ContentFormat | "" })} className={selectClass}>
          <option value="">All formats</option>
          {CONTENT_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select aria-label="Platform" value={value.platform} onChange={(e) => onChange({ ...value, platform: e.target.value as Platform | "" })} className={selectClass}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
