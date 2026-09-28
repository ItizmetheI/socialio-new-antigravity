import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import ErrorBanner from "../components/ErrorBanner";
import ResultsView from "../components/workspace/ResultsView";
import { PLATFORMS } from "../lib/database.types";
import type { PerformanceReport, Platform } from "../lib/database.types";
import { platformLabel } from "../components/workspace/requestMeta";

const fieldClass =
  "bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white w-full focus:outline-none focus:border-primary transition-colors";
const labelClass = "block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold";

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const EMPTY_FORM = { month: lastMonth(), platform: "instagram" as Platform, followers: "", reach: "", engagement: "", posts: "", notes: "" };

// Blank stays null ("not measured"), never 0.
const toInt = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))));

// Staff enter one row per month and platform; saving the same pair again
// updates it (unique constraint in schema_workspace.sql).
export default function ResultsEditor({ orgId }: { orgId: string }) {
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("performance_reports")
      .select("*")
      .eq("org_id", orgId)
      .order("period_month", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!isMounted) return;
        if (loadError) setError("Couldn't load results.");
        else setReports((data ?? []) as PerformanceReport[]);
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const engagement = form.engagement.trim() === "" ? null : Number(form.engagement);
    if (engagement != null && (Number.isNaN(engagement) || engagement < 0 || engagement > 100)) {
      setError("Engagement rate is a percentage between 0 and 100.");
      return;
    }
    if ([form.followers, form.reach, form.posts].some((v) => v.trim() !== "" && Number.isNaN(Number(v)))) {
      setError("Followers, reach and posts must be numbers.");
      return;
    }
    setError("");
    setIsSaving(true);
    const row = {
      org_id: orgId,
      period_month: `${form.month}-01`,
      platform: form.platform,
      followers: toInt(form.followers),
      reach: toInt(form.reach),
      engagement_rate: engagement,
      posts_published: toInt(form.posts),
      notes: form.notes.trim() || null,
    };
    const { data, error: saveError } = await supabase
      .from("performance_reports")
      .upsert(row, { onConflict: "org_id,period_month,platform" })
      .select()
      .single();
    setIsSaving(false);
    if (saveError || !data) {
      setError(`Couldn't save: ${saveError?.message ?? "unknown error"}`);
      return;
    }
    const saved = data as PerformanceReport;
    setReports((current) =>
      [...current.filter((r) => !(r.period_month === saved.period_month && r.platform === saved.platform)), saved].sort((a, b) =>
        a.period_month.localeCompare(b.period_month),
      ),
    );
    setForm({ ...EMPTY_FORM, month: form.month });
  };

  const remove = async (report: PerformanceReport) => {
    const { error: deleteError } = await supabase.from("performance_reports").delete().eq("id", report.id);
    if (deleteError) {
      setError(`Couldn't delete: ${deleteError.message}`);
      return;
    }
    setReports((current) => current.filter((r) => r.id !== report.id));
  };

  const set = (key: keyof typeof EMPTY_FORM) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={save} className="bg-background border border-white/10 rounded-2xl p-5">
        <div className="text-sm font-bold text-white mb-4">Add or update a month</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label htmlFor="res-month" className={labelClass}>Month</label>
            <input id="res-month" type="month" required value={form.month} onChange={set("month")} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="res-platform" className={labelClass}>Platform</label>
            <select id="res-platform" value={form.platform} onChange={set("platform")} className={fieldClass}>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="res-followers" className={labelClass}>Followers</label>
            <input id="res-followers" inputMode="numeric" value={form.followers} onChange={set("followers")} placeholder="e.g. 2690" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="res-reach" className={labelClass}>Reach</label>
            <input id="res-reach" inputMode="numeric" value={form.reach} onChange={set("reach")} placeholder="e.g. 14100" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="res-eng" className={labelClass}>Engagement %</label>
            <input id="res-eng" inputMode="decimal" value={form.engagement} onChange={set("engagement")} placeholder="e.g. 4.6" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="res-posts" className={labelClass}>Posts published</label>
            <input id="res-posts" inputMode="numeric" value={form.posts} onChange={set("posts")} placeholder="e.g. 16" className={fieldClass} />
          </div>
          <div className="col-span-2">
            <label htmlFor="res-notes" className={labelClass}>Note for the client (optional)</label>
            <input id="res-notes" maxLength={1000} value={form.notes} onChange={set("notes")} placeholder="e.g. Reel on 9/14 drove most of the growth" className={fieldClass} />
          </div>
        </div>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-white text-background hover:bg-primary hover:text-[#fff] font-bold text-sm transition-colors disabled:opacity-50">
          {isSaving ? "Saving..." : "Save month"}
        </button>
      </form>

      {reports.length > 0 && (
        <>
          <ResultsView reports={reports} />
          <details className="text-sm">
            <summary className="cursor-pointer text-on-surface-variant hover:text-white">Delete a row</summary>
            <ul className="mt-3 flex flex-col gap-2">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between bg-background border border-white/10 rounded-xl px-4 py-2">
                  <span className="text-white">
                    {r.period_month.slice(0, 7)} · {platformLabel(r.platform)}
                  </span>
                  <button onClick={() => remove(r)} aria-label={`Delete ${r.period_month.slice(0, 7)} ${platformLabel(r.platform)}`} className="text-on-surface-variant hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
