import type { Organization, Profile, Proposal, ProposalItem, Request, Comment, Deliverable } from "../database.types";

export const TEST_STAFF_ID = "staff-priya";

export const ORG_AURORA_ID = "org-aurora";
export const ORG_NORTHWIND_ID = "org-northwind";

export const mockOrganizations: Organization[] = [
  { id: ORG_AURORA_ID, name: "Aurora Skincare", stripe_customer_id: null, status: "active", created_at: "2026-08-01T00:00:00Z" },
  { id: ORG_NORTHWIND_ID, name: "Northwind Coffee Co.", stripe_customer_id: null, status: "active", created_at: "2026-08-10T00:00:00Z" },
];

export const mockProfiles: Profile[] = [
  { id: "staff-morgan", org_id: null, role: "internal", full_name: "Morgan Lee", is_active: true, created_at: "2026-07-01T00:00:00Z" },
  { id: TEST_STAFF_ID, org_id: null, role: "admin", full_name: "Priya Nandan", is_active: true, created_at: "2026-06-01T00:00:00Z" },
];

export const mockProposals: Proposal[] = [
  {
    id: "prop-aurora-1",
    org_id: ORG_AURORA_ID,
    created_by: TEST_STAFF_ID,
    status: "pending",
    total_price: 738,
    created_at: "2026-09-10T00:00:00Z",
    responded_at: null,
  },
  {
    id: "prop-northwind-1",
    org_id: ORG_NORTHWIND_ID,
    created_by: TEST_STAFF_ID,
    status: "approved",
    total_price: 1278,
    created_at: "2026-08-15T00:00:00Z",
    responded_at: "2026-08-16T00:00:00Z",
  },
];

export const mockProposalItems: ProposalItem[] = [
  { id: "item-aurora-1", proposal_id: "prop-aurora-1", service_id: "social-media-posts", tier_label: "30 Posts", price: 279 },
  { id: "item-aurora-2", proposal_id: "prop-aurora-1", service_id: "short-form-videos", tier_label: "20 Videos", price: 459 },
  { id: "item-northwind-1", proposal_id: "prop-northwind-1", service_id: "social-media-posts", tier_label: "20 Posts", price: 179 },
  { id: "item-northwind-2", proposal_id: "prop-northwind-1", service_id: "ugc-content", tier_label: "6 Videos", price: 1099 },
];

export const mockRequests: Request[] = [
  {
    id: "req-1",
    org_id: ORG_NORTHWIND_ID,
    proposal_item_id: "item-northwind-1",
    title: "September Instagram carousel batch",
    description: "First batch of branded carousel posts for Instagram + LinkedIn.",
    service_type: "social-media-posts",
    stage: "requested",
    assigned_to: null,
    created_by: TEST_STAFF_ID,
    due_date: "2026-09-25",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "req-2",
    org_id: ORG_NORTHWIND_ID,
    proposal_item_id: "item-northwind-2",
    title: "Founder story UGC video",
    description: "A founder-led UGC video introducing the new cold brew line.",
    service_type: "ugc-content",
    stage: "in_progress",
    assigned_to: "staff-morgan",
    created_by: TEST_STAFF_ID,
    due_date: "2026-09-20",
    created_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-09-05T00:00:00Z",
  },
  {
    id: "req-3",
    org_id: ORG_NORTHWIND_ID,
    proposal_item_id: "item-northwind-2",
    title: "Cold brew launch UGC set",
    description: "Three creator-led videos for the cold brew launch.",
    service_type: "ugc-content",
    stage: "review",
    assigned_to: "staff-morgan",
    created_by: TEST_STAFF_ID,
    due_date: "2026-09-18",
    created_at: "2026-08-22T00:00:00Z",
    updated_at: "2026-09-12T00:00:00Z",
  },
  {
    id: "req-4",
    org_id: ORG_NORTHWIND_ID,
    proposal_item_id: "item-northwind-1",
    title: "September content calendar",
    description: "Full content calendar and copy for the month.",
    service_type: "social-media-posts",
    stage: "delivered",
    assigned_to: "staff-morgan",
    created_by: TEST_STAFF_ID,
    due_date: "2026-09-10",
    created_at: "2026-08-25T00:00:00Z",
    updated_at: "2026-09-09T00:00:00Z",
  },
];

export const mockComments: Comment[] = [
  {
    id: "comment-1",
    request_id: "req-3",
    author_id: "staff-morgan",
    body: "First cut uploaded — let us know if the pacing works before we lock the final export.",
    visibility: "client",
    created_at: "2026-09-12T14:00:00Z",
  },
  {
    id: "comment-2",
    request_id: "req-3",
    author_id: TEST_STAFF_ID,
    body: "Client mentioned on the call they want a slightly warmer color grade — flagging before final.",
    visibility: "internal",
    created_at: "2026-09-12T15:30:00Z",
  },
];

export const mockDeliverables: Deliverable[] = [
  {
    id: "deliverable-1",
    request_id: "req-4",
    file_path: `${ORG_NORTHWIND_ID}/req-4/september-content-calendar.pdf`,
    uploaded_by: "staff-morgan",
    created_at: "2026-09-09T00:00:00Z",
  },
];
