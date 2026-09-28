import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import Spinner from "../Spinner";
import ErrorBanner from "../ErrorBanner";
import type { BrandColor, BrandKit, Platform } from "../../lib/database.types";
import { platformLabel } from "./requestMeta";

// Limits mirror the CHECK constraints in schema_workspace.sql.
const MAX_COLORS = 12;
const MAX_RULES = 20;
const HEX = /^#[0-9a-fA-F]{6}$/;
const HANDLE_PLATFORMS: Platform[] = ["instagram", "tiktok", "linkedin", "x", "facebook", "youtube"];

type Draft = {
  tagline: string;
  colors: BrandColor[];
  voice: string;
  audience: string;
  dos: string[];
  donts: string[];
  handles: Partial<Record<Platform, string>>;
};

const EMPTY: Draft = {
  tagline: "",
  colors: [{ label: "Primary", hex: "#1b75bc" }],
  voice: "",
  audience: "",
  dos: [],
  donts: [],
  handles: {},
};

const fieldClass =
  "bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white w-full focus:outline-none focus:border-primary transition-colors";
const labelClass = "block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold";

function RuleList({ title, items, onChange, placeholder }: { title: string; items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim();
    if (!text || items.length >= MAX_RULES) return;
    onChange([...items, text]);
    setDraft("");
  };
  return (
    <div>
      <div className={labelClass}>{title}</div>
      <ul className="flex flex-col gap-2 mb-3">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-start justify-between gap-3 bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white">
            <span>{item}</span>
            <button type="button" aria-label={`Remove "${item}"`} onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-on-surface-variant hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={fieldClass}
        />
        <button type="button" onClick={add} disabled={items.length >= MAX_RULES} className="px-4 rounded-xl border border-white/15 text-white hover:bg-white/5 disabled:opacity-40" aria-label={`Add to ${title}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function BrandKitEditor({ orgId }: { orgId: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("brand_kits")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setLoadError("Couldn't load the brand kit. Try refreshing.");
          return;
        }
        const kit = data as BrandKit | null;
        setSavedAt(kit?.updated_at ?? null);
        setDraft(
          kit
            ? {
                tagline: kit.tagline ?? "",
                colors: kit.colors.length ? kit.colors : EMPTY.colors,
                voice: kit.voice ?? "",
                audience: kit.audience ?? "",
                dos: kit.dos,
                donts: kit.donts,
                handles: kit.handles ?? {},
              }
            : EMPTY,
        );
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  if (loadError) return <ErrorBanner message={loadError} />;
  if (!draft) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const update = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    if (status.kind === "saved") setStatus({ kind: "idle" });
  };
  const setColor = (i: number, patch: Partial<BrandColor>) =>
    update({ colors: draft.colors.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  const save = async () => {
    const badColor = draft.colors.find((c) => !HEX.test(c.hex));
    if (badColor) {
      setStatus({ kind: "error", message: `"${badColor.hex}" isn't a colour code. Use the form #1b75bc.` });
      return;
    }
    setStatus({ kind: "saving" });
    const handles = Object.fromEntries(
      Object.entries(draft.handles).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v),
    );
    const { data, error } = await supabase
      .from("brand_kits")
      .upsert(
        {
          org_id: orgId,
          tagline: draft.tagline.trim() || null,
          colors: draft.colors.map((c) => ({ label: c.label.trim() || "Colour", hex: c.hex })),
          voice: draft.voice.trim() || null,
          audience: draft.audience.trim() || null,
          dos: draft.dos,
          donts: draft.donts,
          handles,
        },
        { onConflict: "org_id" },
      )
      .select()
      .single();
    if (error) {
      setStatus({ kind: "error", message: `Couldn't save: ${error.message}` });
      return;
    }
    setSavedAt((data as BrandKit | null)?.updated_at ?? new Date().toISOString());
    setStatus({ kind: "saved" });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="bk-tagline" className={labelClass}>Tagline</label>
          <input id="bk-tagline" value={draft.tagline} maxLength={200} onChange={(e) => update({ tagline: e.target.value })} placeholder="The line you'd put under your logo" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="bk-voice" className={labelClass}>Tone of voice</label>
          <textarea id="bk-voice" rows={5} maxLength={2000} value={draft.voice} onChange={(e) => update({ voice: e.target.value })} placeholder="e.g. Warm, direct, a little cheeky. Never corporate." className={`${fieldClass} resize-none`} />
        </div>
        <div>
          <label htmlFor="bk-audience" className={labelClass}>Who you&apos;re talking to</label>
          <textarea id="bk-audience" rows={5} maxLength={2000} value={draft.audience} onChange={(e) => update({ audience: e.target.value })} placeholder="e.g. Busy 25–40 year-old professionals who care where their coffee comes from." className={`${fieldClass} resize-none`} />
        </div>
      </section>

      <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8">
        <h2 className="font-bold text-white mb-1">Colours</h2>
        <p className="text-sm text-on-surface-variant mb-5">Our designers use exactly these in your graphics.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {draft.colors.map((color, i) => (
            <div key={i} className="flex items-center gap-3 bg-background border border-white/10 rounded-2xl p-3">
              <input type="color" aria-label={`${color.label || "Colour"} picker`} value={HEX.test(color.hex) ? color.hex : "#000000"} onChange={(e) => setColor(i, { hex: e.target.value })} className="w-12 h-12 rounded-xl border-0 bg-transparent cursor-pointer shrink-0" />
              <div className="flex-1 min-w-0">
                <input aria-label="Colour name" value={color.label} maxLength={40} onChange={(e) => setColor(i, { label: e.target.value })} className="bg-transparent text-sm font-bold text-white w-full focus:outline-none" />
                <input aria-label="Hex code" value={color.hex} maxLength={7} onChange={(e) => setColor(i, { hex: e.target.value })} className={`bg-transparent text-xs font-mono w-full focus:outline-none ${HEX.test(color.hex) ? "text-on-surface-variant" : "text-red-400"}`} />
              </div>
              <button type="button" aria-label={`Remove ${color.label || "colour"}`} onClick={() => update({ colors: draft.colors.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {draft.colors.length < MAX_COLORS && (
          <button type="button" onClick={() => update({ colors: [...draft.colors, { label: "Accent", hex: "#652c91" }] })} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <Plus className="w-4 h-4" /> Add colour
          </button>
        )}
      </section>

      <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8 grid md:grid-cols-2 gap-8">
        <RuleList title="Always do" items={draft.dos} onChange={(dos) => update({ dos })} placeholder="e.g. Show the product in real hands" />
        <RuleList title="Never do" items={draft.donts} onChange={(donts) => update({ donts })} placeholder="e.g. No stock photos of handshakes" />
      </section>

      <section className="bg-surface-container border border-white/10 rounded-3xl p-6 md:p-8">
        <h2 className="font-bold text-white mb-5">Social handles</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HANDLE_PLATFORMS.map((p) => (
            <div key={p}>
              <label htmlFor={`bk-${p}`} className={labelClass}>{platformLabel(p)}</label>
              <input id={`bk-${p}`} value={draft.handles[p] ?? ""} maxLength={100} onChange={(e) => update({ handles: { ...draft.handles, [p]: e.target.value } })} placeholder="@yourbrand" className={fieldClass} />
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-4 bg-surface-container/95 backdrop-blur border border-white/10 rounded-2xl px-5 py-4 shadow-xl">
        <button onClick={save} disabled={status.kind === "saving"} className="px-6 py-3 rounded-xl bg-white text-background hover:bg-primary hover:text-[#fff] font-bold text-sm transition-colors disabled:opacity-50">
          {status.kind === "saving" ? "Saving..." : "Save brand kit"}
        </button>
        {status.kind === "saved" && <span className="text-sm text-emerald-500">Saved.</span>}
        {status.kind === "error" && <span className="text-sm text-red-400">{status.message}</span>}
        {status.kind === "idle" && savedAt && <span className="text-xs text-on-surface-variant">Last saved {new Date(savedAt).toLocaleString()}</span>}
      </div>
    </div>
  );
}
