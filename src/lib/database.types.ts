// Hand-written to match supabase/schema.sql exactly. Once a real Supabase
// project exists, regenerate this via `supabase gen types typescript` and
// diff against this file to catch any drift between the two.

export type UserRole = "client" | "internal" | "admin";
export type ProposalStatus = "pending" | "approved" | "rejected";
export type RequestStage = "requested" | "in_progress" | "review" | "delivered";
export type CommentVisibility = "client" | "internal";
export type OrganizationStatus = "prospect" | "active" | "paused" | "canceled";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";
export type OrderItemType = "service" | "addon";
export type BillingInterval = "month" | "one_time";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";
export type PaymentStatus = "succeeded" | "failed" | "refunded";
export type OnboardingStatus = "not_started" | "in_progress" | "submitted" | "reviewed";

// Free-form by design (jsonb column) — this is the shape the frontend reads
// and writes, not a DB-enforced schema. Add fields here as the intake form
// grows; older rows simply won't have newer keys.
export interface OnboardingAnswers {
  business_name?: string;
  business_description?: string;
  target_audience?: string;
  brand_voice?: string;
  platforms?: string[];
  existing_handles?: string;
  goals?: string;
  inspiration?: string;
  content_guidelines?: string;
}

export interface Organization {
  id: string;
  name: string;
  stripe_customer_id: string | null;
  status: OrganizationStatus;
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

export interface ClientOnboarding {
  id: string;
  org_id: string;
  status: OnboardingStatus;
  answers: OnboardingAnswers;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface OnboardingAsset {
  id: string;
  onboarding_id: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface Order {
  id: string;
  org_id: string;
  created_by: string;
  status: OrderStatus;
  currency: string;
  amount_subtotal: number; // cents
  amount_total: number; // cents
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  service_id: string;
  tier_label: string;
  item_type: OrderItemType;
  billing_interval: BillingInterval;
  unit_amount: number; // cents
  quantity: number;
}

export interface Subscription {
  id: string;
  org_id: string;
  order_id: string | null;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  org_id: string;
  order_id: string | null;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  status: PaymentStatus;
  amount: number; // cents
  currency: string;
  created_at: string;
}

export const REQUEST_STAGES: { value: RequestStage; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "delivered", label: "Delivered" },
];
