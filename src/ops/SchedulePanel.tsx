import { useState } from "react";
import { supabase } from "../lib/supabase";
import { CONTENT_FORMATS, PLATFORMS } from "../lib/database.types";
import type { ContentFormat, Platform, Request } from "../lib/database.types";
import { PLATFORM_COLORS } from "../components/workspace/requestMeta";

type Props = { request: Request; onSaved: (updated: Request) => void };

// <input type="datetime-local"> works in local time with no zone suffix.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fieldClass = "field";
const labelClass = "field-label";

export default function SchedulePanel({ request, onSaved }: Props) {
  const [dueDate, setDueDate] = useState(request.due_date ?? "");
  const [publishAt, setPublishAt] = useState(toLocalInput(request.publish_at));
  const [format, setFormat] = useState<ContentFormat | "">(request.format ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(request.platforms);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });

  const togglePlatform = (p: Platform) =>
    setPlatforms((current) => (current.includes(p) ? current.filter((x) => x !== p) : [...current, p]));

  const save = async () => {
    setStatus({ kind: "saving" });
    const changes = {
      due_date: dueDate || null,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      format: format || null,
      platforms,
    };
    const { error } = await supabase.from("requests").update(changes).eq("id", request.id);
    if (error) {
      setStatus({ kind: "error", message: `Couldn't save: ${error.message}` });
      return;
    }
    onSaved({ ...request, ...changes });
    setStatus({ kind: "saved" });
  };

  return (
    <section className="bg-surface-container border border-white/10 rounded-3xl p-6 mb-10">
      <h2 className="font-bold text-white mb-5">Schedule &amp; format</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label htmlFor="sched-due" className={labelClass}>Due date</label>
          <input id="sched-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="sched-publish" className={labelClass}>Publish at</label>
          <input id="sched-publish" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="sched-format" className={labelClass}>Format</label>
          <select id="sched-format" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat | "")} className={fieldClass}>
            <option value="">Not set</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={labelClass}>Platforms</div>
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Platforms">
        {PLATFORMS.map((p) => {
          const isOn = platforms.includes(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePlatform(p.value)}
              aria-pressed={isOn}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                isOn ? "bg-white text-background border-white" : "border-white/10 text-on-surface-variant hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[p.value] }} />
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={save}
          disabled={status.kind === "saving"}
          className="btn-primary"
        >
          {status.kind === "saving" ? "Saving..." : "Save schedule"}
        </button>
        {status.kind === "saved" && <span className="text-sm text-emerald-400 light:text-emerald-700">Saved.</span>}
        {status.kind === "error" && <span className="text-sm text-error">{status.message}</span>}
      </div>
    </section>
  );
}
