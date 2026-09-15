import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../lib/auth/AuthContext";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request, Comment, Deliverable, RequestStage, CommentVisibility, Organization } from "../lib/database.types";

type LoadState = "loading" | "error" | "ready";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<CommentVisibility>("client");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isChangingStage, setIsChangingStage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const requestData = requestRes.data as Request;
    setRequest(requestData);
    setComments((commentsRes.data ?? []) as Comment[]);
    setDeliverables((deliverablesRes.data ?? []) as Deliverable[]);

    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", requestData.org_id)
      .single();
    setOrg(orgData as Organization | null);
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
      visibility: commentVisibility,
    });
    setIsPosting(false);
    if (!error) {
      setNewComment("");
      await load();
    }
  };

  const changeStage = async (newStage: RequestStage) => {
    if (!id || !request) return;
    setIsChangingStage(true);
    const { error } = await supabase.from("requests").update({ stage: newStage }).eq("id", id);
    setIsChangingStage(false);
    if (!error) {
      setRequest({ ...request, stage: newStage });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request || !profile) return;
    setIsUploading(true);
    setUploadError("");
    const filePath = `${request.org_id}/${request.id}/${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("deliverables").upload(filePath, file);
    if (uploadErr) {
      setIsUploading(false);
      setUploadError(uploadErr.message);
      return;
    }
    const { error: insertErr } = await supabase.from("deliverables").insert({
      request_id: request.id,
      file_path: filePath,
      uploaded_by: profile.id,
    });
    setIsUploading(false);
    if (insertErr) {
      setUploadError(insertErr.message);
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    await load();
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

  return (
    <div className="p-10 max-w-3xl">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{org?.name ?? "—"}</div>
        <h1 className="hero-display font-bold text-3xl text-white mb-3">{request.title}</h1>
        {request.description && <p className="text-on-surface-variant mb-4">{request.description}</p>}
        <select
          value={request.stage}
          onChange={(e) => changeStage(e.target.value as RequestStage)}
          disabled={isChangingStage}
          className="bg-background border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
        >
          {REQUEST_STAGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Deliverables</h2>
        <div className="flex flex-col gap-3 mb-4">
          {deliverables.length === 0 && <p className="text-on-surface-variant text-sm">Nothing uploaded yet.</p>}
          {deliverables.map((deliverable) => (
            <div
              key={deliverable.id}
              className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4 text-sm text-white"
            >
              {deliverable.file_path.split("/").pop()}
            </div>
          ))}
        </div>
        {uploadError && (
          <div className="mb-4">
            <ErrorBanner message={uploadError} />
          </div>
        )}
        <label className="inline-flex items-center gap-2 px-5 py-3 border border-white/20 rounded-xl text-sm font-bold text-white hover:bg-white/5 transition-colors cursor-pointer w-fit">
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload deliverable"}
          <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={isUploading} className="hidden" />
        </label>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Comments</h2>
        <div className="flex flex-col gap-4 mb-6">
          {comments.length === 0 && <p className="text-on-surface-variant text-sm">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                {comment.visibility === "internal" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                    Internal
                  </span>
                )}
              </div>
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={commentVisibility === "internal"}
                onChange={(e) => setCommentVisibility(e.target.checked ? "internal" : "client")}
                className="accent-primary"
              />
              Internal only
            </label>
            <button
              type="submit"
              disabled={isPosting || !newComment.trim()}
              className="px-6 py-3 bg-white text-black hover:bg-primary hover:text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
            >
              {isPosting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
