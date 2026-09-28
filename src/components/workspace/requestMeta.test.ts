import { describe, expect, it } from "vitest";
import type { Request } from "../../lib/database.types";
import { EMPTY_FILTERS, calendarDay, filterRequests } from "./requestMeta";

const req = (overrides: Partial<Request>): Request => ({
  id: "r",
  org_id: "org-a",
  proposal_item_id: null,
  plan_item_id: null,
  title: "Untitled",
  description: null,
  service_type: null,
  stage: "requested",
  assigned_to: null,
  created_by: "u",
  due_date: null,
  format: null,
  platforms: [],
  publish_at: null,
  order_item_id: null,
  units: 1,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

const requests = [
  req({ id: "1", title: "Launch Reel", format: "reel", platforms: ["instagram", "tiktok"] }),
  req({ id: "2", title: "Blog post", description: "SEO piece about LAUNCH week", format: "seo_article", platforms: ["blog"], org_id: "org-b" }),
  req({ id: "3", title: "Carousel", format: "carousel", platforms: ["linkedin"] }),
];
const ids = (rs: Request[]) => rs.map((r) => r.id);

describe("filterRequests", () => {
  it("returns everything with empty filters", () => {
    expect(ids(filterRequests(requests, EMPTY_FILTERS))).toEqual(["1", "2", "3"]);
  });

  it("searches title and description, trimmed and case-insensitive", () => {
    expect(ids(filterRequests(requests, { ...EMPTY_FILTERS, search: "  launch " }))).toEqual(["1", "2"]);
  });

  it("filters by format, platform and org, combined with AND", () => {
    expect(ids(filterRequests(requests, { ...EMPTY_FILTERS, format: "reel" }))).toEqual(["1"]);
    expect(ids(filterRequests(requests, { ...EMPTY_FILTERS, platform: "tiktok" }))).toEqual(["1"]);
    expect(ids(filterRequests(requests, { ...EMPTY_FILTERS, orgId: "org-b" }))).toEqual(["2"]);
    expect(ids(filterRequests(requests, { ...EMPTY_FILTERS, search: "launch", orgId: "org-a" }))).toEqual(["1"]);
    expect(filterRequests(requests, { ...EMPTY_FILTERS, format: "reel", platform: "blog" })).toEqual([]);
  });
});

describe("calendarDay", () => {
  it("uses the publish time's local day, not its UTC day", () => {
    // 02:00 UTC Oct 1 = 22:00 Sept 30 in New York.
    expect(calendarDay(req({ publish_at: "2026-10-01T02:00:00Z" }))).toEqual({ day: "2026-09-30", kind: "publish" });
  });

  it("prefers publish_at over due_date", () => {
    expect(calendarDay(req({ publish_at: "2026-09-10T15:00:00Z", due_date: "2026-09-20" }))).toEqual({ day: "2026-09-10", kind: "publish" });
  });

  it("falls back to the date-only due_date unchanged", () => {
    expect(calendarDay(req({ due_date: "2026-09-30" }))).toEqual({ day: "2026-09-30", kind: "due" });
  });

  it("returns null when neither is set", () => {
    expect(calendarDay(req({}))).toBeNull();
  });
});
