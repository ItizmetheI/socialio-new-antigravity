// Hand-written to match supabase/schema.sql exactly. Once a real Supabase
// project exists, regenerate this via `supabase gen types typescript` and
// diff against this file to catch any drift between the two.

export type UserRole = "client" | "internal" | "admin";
export type ProposalStatus = "pending" | "approved" | "rejected";
export type RequestStage = "requested" | "in_progress" | "review" | "delivered";
export type CommentVisibility = "client" | "internal";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Proposal {
  id: string;
  org_id: string;
  created_by: string;
  status: ProposalStatus;
  total_price: number;
  created_at: string;
  responded_at: string | null;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  service_id: string;
  tier_label: string;
  price: number;
}

export interface Request {
  id: string;
  org_id: string;
  proposal_item_id: string | null;
  title: string;
  description: string | null;
  service_type: string | null;
  stage: RequestStage;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  request_id: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  visibility: CommentVisibility;
  created_at: string;
}

export const REQUEST_STAGES: { value: RequestStage; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "delivered", label: "Delivered" },
];
