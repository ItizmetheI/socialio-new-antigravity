import { useEffect, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
export { storagePathFor } from "../lib/storagePath";

export const DELIVERABLES_BUCKET = "deliverables";
// Links are generated when the list renders; an hour covers a long review
// session without leaving a shareable URL alive indefinitely.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Uploads are stored as "{timestamp}-{original name}" so re-uploading a file
// with the same name doesn't collide — show people the name they uploaded.
export function displayFileName(path: string) {
  return (path.split("/").pop() ?? path).replace(/^\d{13}-/, "");
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

// Anything stored in the bucket — deliverables and onboarding assets share it.
export type StoredFile = { id: string; file_path: string; created_at: string };

type Props = {
  deliverables: StoredFile[];
  emptyText?: string;
};

// Private bucket: every file needs a signed URL. All of a request's files are
// signed in one call when the list renders, so "View"/"Download" are plain
// links (a sign-on-click + window.open would trip popup blockers).
export default function DeliverableList({ deliverables, emptyText = "Nothing delivered yet." }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (deliverables.length === 0) return;
    let isMounted = true;
    supabase.storage
      .from(DELIVERABLES_BUCKET)
      .createSignedUrls(
        deliverables.map((d) => d.file_path),
        SIGNED_URL_TTL_SECONDS,
      )
      .then(({ data, error: signError }) => {
        if (!isMounted) return;
        if (signError || !data) {
          setError("Couldn't prepare download links. Refresh to try again.");
          return;
        }
        const next: Record<string, string> = {};
        data.forEach((item) => {
          if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        });
        setUrls(next);
      });
    return () => {
      isMounted = false;
    };
  }, [deliverables]);

  if (deliverables.length === 0) {
    return <p className="text-on-surface-variant text-sm">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {deliverables.map((deliverable) => {
        const name = displayFileName(deliverable.file_path);
        const url = urls[deliverable.file_path];
        return (
          <div key={deliverable.id} className="bg-surface-container border border-white/10 rounded-2xl overflow-hidden">
            {/* Preview what was delivered right here — images and video play inline. */}
            {url && IMAGE_EXT.test(name) && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block bg-black/5">
                <img src={url} alt={name} loading="lazy" className="w-full max-h-80 object-contain" />
              </a>
            )}
            {url && VIDEO_EXT.test(name) && (
              <video src={url} controls preload="metadata" playsInline className="w-full max-h-96 bg-black" />
            )}
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{name}</div>
                  <div className="text-xs text-on-surface-variant">
                    {new Date(deliverable.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!url}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-white/15 text-white hover:bg-white/5 transition-colors ${url ? "" : "pointer-events-none opacity-40"}`}
                >
                  <Eye className="w-3.5 h-3.5" /> Open
                </a>
                <a
                  href={url ? `${url}&download=${encodeURIComponent(name)}` : undefined}
                  aria-disabled={!url}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white text-background hover:bg-primary hover:text-[#fff] transition-colors ${url ? "" : "pointer-events-none opacity-40"}`}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
