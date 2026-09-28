import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { localDateString } from "../lib/format";
import { servicesData } from "../data/services";
import { CONTENT_FORMATS, PLATFORMS } from "../lib/database.types";
import type { ContentFormat, Platform, Request } from "../lib/database.types";
import { PLATFORM_COLORS } from "../components/workspace/requestMeta";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

type Props = {
  orgId: string;
  profileId: string;
  onCreated: (request: Request) => void;
  onCancel: () => void;
};

const inputClass =
  "bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors";
const labelClass = "block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold";

export default function NewRequestForm({ orgId, profileId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState(servicesData[0].id);
  const [dueDate, setDueDate] = useState("");
  const [format, setFormat] = useState<ContentFormat | "">("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const today = localDateString();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Give the request a short title.");
      return;
    }
    if (dueDate && dueDate < today) {
      setError("Pick a due date that isn't in the past.");
      return;
    }
    setIsSaving(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("requests")
      .insert({
        org_id: orgId,
        created_by: profileId,
        stage: "requested",
        title: trimmedTitle,
        description: description.trim() || null,
        service_type: serviceType,
        due_date: dueDate || null,
        format: format || null,
        platforms,
      })
      .select()
      .single();
    setIsSaving(false);
    if (insertError || !data) {
      setError("Couldn't send your request. Try again.");
      return;
    }
    onCreated(data as Request);
  };

  return (
    <form onSubmit={submit} className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 mb-8 flex flex-col gap-5">
      <h2 className="font-bold text-white">New request</h2>
      <div>
        <label htmlFor="req-title" className={labelClass}>Title</label>
        <input
          id="req-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch week Reels for the new flavour"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="req-description" className={labelClass}>What do you need?</label>
        <textarea
          id="req-description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Key message, links, examples you like, anything we should avoid."
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="req-service" className={labelClass}>Service</label>
          <select id="req-service" value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
            {servicesData.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="req-due" className={labelClass}>Needed by (optional)</label>
          <input id="req-due" type="date" min={today} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="req-format" className={labelClass}>Format (optional)</label>
          <select id="req-format" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat | "")} className={inputClass}>
            <option value="">Not sure yet</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className={labelClass}>Where will it go?</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Platforms">
            {PLATFORMS.map((p) => {
              const isOn = platforms.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => setPlatforms((cur) => (isOn ? cur.filter((x) => x !== p.value) : [...cur, p.value]))}
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
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-white text-background hover:bg-primary hover:text-[#fff] font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
        >
          {isSaving ? "Sending..." : "Send request"}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 border border-white/15 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
