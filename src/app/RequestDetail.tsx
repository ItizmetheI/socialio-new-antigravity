import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../lib/auth/AuthContext";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request, Comment, Deliverable } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setState("loading");
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
    if (!error) {
      setNewComment("");
      await load();
    }
  };

  if (state === "loading") {
    return (
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (state === "error" || !request) {
    return (
      <div className="p-10">
        <ErrorBanner message="Couldn't load this request." />
      </div>
    );
  }

  const stageLabel = REQUEST_STAGES.find((s) => s.value === request.stage)?.label ?? request.stage;

  return (
    <div className="p-10 max-w-3xl">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{stageLabel}</div>
        <h1 className="hero-display font-bold text-3xl text-white mb-3">{request.title}</h1>
        {request.description && <p className="text-on-surface-variant">{request.description}</p>}
      </div>

      {deliverables.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Deliverables</h2>
          <div className="flex flex-col gap-3">
            {deliverables.map((deliverable) => (
              <div
                key={deliverable.id}
                className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4 text-sm text-white"
              >
                {deliverable.file_path.split("/").pop()}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Comments</h2>
        <div className="flex flex-col gap-4 mb-6">
          {comments.length === 0 && <p className="text-on-surface-variant text-sm">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4">
              <p className="text-white text-sm">{comment.body}</p>
              <div className="text-xs text-on-surface-variant mt-2">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={postComment} className="flex flex-col gap-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="bg-background border border-white/10 rounded-xl px-4 py-3 text-white w-full focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={isPosting || !newComment.trim()}
            className="self-end px-6 py-3 bg-white text-black hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            {isPosting ? "Posting..." : "Post comment"}
          </button>
        </form>
      </div>
    </div>
  );
}
