import { CONTENT_FORMATS, PLATFORMS } from "../../lib/database.types";
import type { ContentFormat, Platform, Request } from "../../lib/database.types";

export const formatLabel = (format: ContentFormat | null) =>
  CONTENT_FORMATS.find((f) => f.value === format)?.label ?? null;

export const platformLabel = (platform: Platform) => PLATFORMS.find((p) => p.value === platform)?.label ?? platform;

// One colour per platform, used for calendar dots and chips so a glance at
// the month shows where things are going out.
export const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#d6249f",
  tiktok: "#25f4ee",
  linkedin: "#0a66c2",
  x: "#8b8b8b",
  facebook: "#1877f2",
  youtube: "#ff0000",
  blog: "#652c91",
};

export type RequestFilters = { search: string; format: ContentFormat | ""; platform: Platform | ""; orgId: string };

export const EMPTY_FILTERS: RequestFilters = { search: "", format: "", platform: "", orgId: "" };

export function filterRequests(requests: Request[], filters: RequestFilters): Request[] {
  const query = filters.search.trim().toLowerCase();
  return requests.filter(
    (r) =>
      (!query || r.title.toLowerCase().includes(query) || (r.description ?? "").toLowerCase().includes(query)) &&
      (!filters.format || r.format === filters.format) &&
      (!filters.platform || r.platforms.includes(filters.platform)) &&
      (!filters.orgId || r.org_id === filters.orgId),
  );
}

// The day a request shows on the calendar: its publish time if scheduled,
// otherwise its due date. Returned as the viewer's local "YYYY-MM-DD".
export function calendarDay(request: Request): { day: string; kind: "publish" | "due" } | null {
  if (request.publish_at) {
    const d = new Date(request.publish_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    return { day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, kind: "publish" };
  }
  return request.due_date ? { day: request.due_date, kind: "due" } : null;
}
