import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import DeliverableList, { DELIVERABLES_BUCKET, storagePathFor } from "../components/DeliverableList";
import { useAuth } from "../lib/auth/AuthContext";
import SchedulePanel from "./SchedulePanel";
import { REQUEST_STAGES } from "../lib/database.types";
import type { Request, Comment, Deliverable, RequestStage, CommentVisibility, Organization, Profile } from "../lib/database.types";

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
  const [staff, setStaff] = useState<Profile[]>([]);
  const [assignError, setAssignError] = useState("");
  const [actionError, setActionError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // isRefresh: reload after an action without swapping the page for a
  // spinner (which also threw away the scroll position).
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
    const requestData = requestRes.data as Request;
    setRequest(requestData);
    setComments((commentsRes.data ?? []) as Comment[]);
    setDeliverables((deliverablesRes.data ?? []) as Deliverable[]);

    const [{ data: orgData }, { data: staffData }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", requestData.org_id).single(),
      supabase.from("profiles").select("*").in("role", ["internal", "admin"]).eq("is_active", true),
    ]);
    setOrg(orgData as Organization | null);
    setStaff((staffData ?? []) as Profile[]);
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
      visibility: commentVisibility,
    });
    setIsPosting(false);
    if (error) {
      setActionError("Couldn't post your comment. Try again.");
      return;
    }
    setActionError("");
    setNewComment("");
    await load(true);
  };

  const changeStage = async (newStage: RequestStage) => {
    if (!id || !request) return;
    setIsChangingStage(true);
    const { error } = await supabase.from("requests").update({ stage: newStage }).eq("id", id);
    setIsChangingStage(false);
    if (error) {
      setActionError(`Couldn't change the stage: ${error.message}`);
      return;
    }
    setActionError("");
    setRequest({ ...request, stage: newStage });
  };

  const assign = async (assignee: string) => {
    if (!id || !request) return;
    setAssignError("");
    const assignedTo = assignee || null;
    const { error } = await supabase.from("requests").update({ assigned_to: assignedTo }).eq("id", id);
    if (error) {
      setAssignError(error.message);
      return;
    }
    setRequest({ ...request, assigned_to: assignedTo });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request || !profile) return;
    setIsUploading(true);
    setUploadError("");
    const filePath = storagePathFor(request.org_id, request.id, file.name);
    const { error: uploadErr } = await supabase.storage.from(DELIVERABLES_BUCKET).upload(filePath, file);
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
    await load(true);
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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

  return (
    <div className="max-w-3xl">
      <Link to="/ops/board" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Board
      </Link>
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{org?.name ?? "—"}</div>
        <h1 className="hero-display font-bold text-2xl md:text-3xl text-white mb-3 break-words">{request.title}</h1>
        {request.description && <p className="text-on-surface-variant mb-4 break-words whitespace-pre-line">{request.description}</p>}
        <div className="flex flex-wrap gap-3">
        <select
          aria-label="Stage"
          value={request.stage}
          onChange={(e) => changeStage(e.target.value as RequestStage)}
          disabled={isChangingStage}
          className="field w-auto font-bold disabled:opacity-50"
        >
          {REQUEST_STAGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={request.assigned_to ?? ""}
          onChange={(e) => assign(e.target.value)}
          aria-label="Assigned to"
          className="field w-auto font-bold"
        >
          <option value="">Unassigned</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name ?? "Unnamed teammate"}
            </option>
          ))}
        </select>
        </div>
        {assignError && <div className="mt-3"><ErrorBanner message={assignError} /></div>}
        {actionError && <div className="mt-3"><ErrorBanner message={actionError} /></div>}
      </div>

      <SchedulePanel key={request.id} request={request} onSaved={setRequest} />

      <div className="mb-10">
        <h2 className="font-bold text-white mb-4">Deliverables</h2>
        <div className="mb-4">
          <DeliverableList deliverables={deliverables} emptyText="Nothing uploaded yet." />
        </div>
        {uploadError && (
          <div className="mb-4">
            <ErrorBanner message={uploadError} />
          </div>
        )}
        <label className="btn-secondary cursor-pointer w-fit">
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload deliverable"}
          <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={isUploading} className="hidden" />
        </label>
      </div>

      <div>
        <h2 className="font-bold text-white mb-4">Comments</h2>
        <div className="flex flex-col gap-4 mb-6">
          {comments.length === 0 && <p className="text-on-surface-variant text-sm">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="bg-surface-container border border-white/10 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                {comment.visibility === "internal" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 light:text-amber-700 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                    Internal
                  </span>
                )}
              </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              className="btn-primary"
            >
              {isPosting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
