import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import DeliverableList from "../components/DeliverableList";
import { formatLabel, platformLabel } from "../components/workspace/requestMeta";
import { formatDate } from "../lib/format";
import { useAuth } from "../lib/auth/AuthContext";
import { STAGE_STYLE } from "../components/workspace/stageStyle";
import type { Request, Comment, Deliverable, RequestStage } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

// Work in "review" is waiting on the client: approve it, or send it back
// with a note (the note is required so the team knows what to change).
function ReviewPanel({ onDecide }: { onDecide: (stage: RequestStage, note: string) => Promise<string | null> }) {
  const [mode, setMode] = useState<"idle" | "changes">("idle");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const decide = async (stage: RequestStage) => {
    if (stage === "in_progress" && !note.trim()) {
      setError("Tell us what to change so we can get it right.");
      return;
    }
    setIsSaving(true);
    setError("");
    const failure = await onDecide(stage, note.trim());
    setIsSaving(false);
    if (failure) setError(failure);
  };

  return (
    <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5">
      <h3 className="font-bold text-white mb-1">Ready for your review</h3>
      <p className="text-sm text-on-surface-variant mb-5">Look through the files below, then approve or ask for changes.</p>
      {mode === "changes" && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What should we change?"
          rows={3}
          autoFocus
          aria-label="What should we change?"
          className="field resize-none mb-4"
        />
      )}
      {error && <p className="text-error text-sm mb-4">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {mode === "idle" ? (
          <>
            <button onClick={() => decide("delivered")} disabled={isSaving} className="btn-primary">
              <CheckCircle2 className="w-4 h-4" /> {isSaving ? "Saving..." : "Approve"}
            </button>
            <button onClick={() => setMode("changes")} disabled={isSaving} className="btn-secondary">
              <RotateCcw className="w-4 h-4" /> Request changes
            </button>
          </>
        ) : (
          <>
            <button onClick={() => decide("in_progress")} disabled={isSaving} className="btn-primary">
              {isSaving ? "Sending..." : "Send changes"}
            </button>
            <button onClick={() => { setMode("idle"); setError(""); }} disabled={isSaving} className="btn-secondary">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// One piece of work: brief, files, review decision and comments. Rendered
// inside the client home's side panel (RequestDrawer). `onChanged` lets the
// page behind refresh its lanes after an approve / request-changes.
export default function RequestDetail({ id, onChanged }: { id: string; onChanged?: () => void }) {
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [commentError, setCommentError] = useState("");

  // isRefresh: reload after posting without swapping the page for a spinner.
  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setState("loading");
    const [requestRes, commentsRes, deliverablesRes] = await Promise.all([
      supabase.from("requests").select("*").eq("id", id).single(),
      supabase.from("comments").select("*").eq("request_id", id).order("created_at", { ascending: true }),
      supabase.from("deliverables").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    ]);
    if (requestRes.error || commentsRes.error || deliverablesRes.error) {
      setState("error");
      return;
    }
    setRequest(requestRes.data as Request);
    setComments((commentsRes.data ?? []) as Comment[]);
    setDeliverables((deliverablesRes.data ?? []) as Deliverable[]);
    setState("ready");
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);
  // Stage changes, comments and files from the other side appear live.
  useLiveRefresh(["requests"], () => load(true), id ? `id=eq.${id}` : undefined);
  useLiveRefresh(["comments", "deliverables"], () => load(true), id ? `request_id=eq.${id}` : undefined);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id || !profile) return;
    setIsPosting(true);
    const { error } = await supabase.from("comments").insert({
      request_id: id,
      author_id: profile.id,
      body: newComment.trim(),
      visibility: "client",
    });
    setIsPosting(false);
    if (error) {
      setCommentError("Couldn't post your comment. Try again.");
      return;
    }
    setCommentError("");
    setNewComment("");
    await load(true);
  };

  const decide = async (stage: RequestStage, note: string): Promise<string | null> => {
    if (!id || !profile) return "You're signed out. Sign in and try again.";
    if (note) {
      const { error: noteError } = await supabase
        .from("comments")
        .insert({ request_id: id, author_id: profile.id, body: note, visibility: "client" });
      if (noteError) return "Couldn't save your note. Try again.";
    }
    const { error } = await supabase.from("requests").update({ stage }).eq("id", id);
    if (error) return "Couldn't update this request. Try again.";
    await load(true);
    onChanged?.();
    return null;
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !request) {
    return (
      <div>
        <ErrorBanner message="Couldn't load this request." />
      </div>
    );
  }

  const stage = STAGE_STYLE[request.stage];

  return (
    <div>
      <div className="mb-8">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${stage.tint} ${stage.text} mb-3`}>
          <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} /> {stage.clientLabel}
        </span>
        <h2 className="hero-display font-bold text-2xl text-white mb-3 break-words">{request.title}</h2>
        {request.description && <p className="text-on-surface-variant mb-4 break-words whitespace-pre-line">{request.description}</p>}
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {request.format && (
            <div>
              <dt className="text-xs text-on-surface-variant">Format</dt>
              <dd className="text-white font-bold">{formatLabel(request.format)}</dd>
            </div>
          )}
          {request.platforms.length > 0 && (
            <div>
              <dt className="text-xs text-on-surface-variant">Platforms</dt>
              <dd className="text-white font-bold">{request.platforms.map(platformLabel).join(", ")}</dd>
            </div>
          )}
          {request.due_date && (
            <div>
              <dt className="text-xs text-on-surface-variant">Due</dt>
              <dd className="text-white font-bold">{formatDate(request.due_date)}</dd>
            </div>
          )}
          {request.publish_at && (
            <div>
              <dt className="text-xs text-on-surface-variant">Goes live</dt>
              <dd className="text-white font-bold">
                {new Date(request.publish_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {request.stage === "review" && <ReviewPanel onDecide={decide} />}

      {deliverables.length > 0 && (
        <div className="mb-10">
          <h3 className="font-bold text-white mb-4">Files</h3>
          <DeliverableList deliverables={deliverables} />
        </div>
      )}

      <div>
        <h3 className="font-bold text-white mb-4">Comments</h3>
        <div className="flex flex-col gap-4 mb-6">
          {comments.length === 0 && <p className="text-on-surface-variant text-sm">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4">
              <p className="text-white text-sm break-words whitespace-pre-line">{comment.body}</p>
              <div className="text-xs text-on-surface-variant mt-2">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={postComment} className="flex flex-col gap-3">
          <textarea
            aria-label="Add a comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="field resize-none"
          />
          <button
            type="submit"
            disabled={isPosting || !newComment.trim()}
            className="btn-primary self-end"
          >
            {isPosting ? "Posting..." : "Post comment"}
          </button>
          {commentError && <p className="text-error text-sm">{commentError}</p>}
        </form>
      </div>
    </div>
  );
}
