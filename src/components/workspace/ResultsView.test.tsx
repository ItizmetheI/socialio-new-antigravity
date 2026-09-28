import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PerformanceReport, Platform } from "../../lib/database.types";
import ResultsView from "./ResultsView";

let nextId = 0;
const report = (
  period_month: string,
  platform: Platform,
  followers: number,
  reach: number,
  engagement_rate: number | null,
  posts_published: number,
): PerformanceReport => ({
  id: `r${nextId++}`,
  org_id: "org",
  period_month,
  platform,
  followers,
  reach,
  engagement_rate,
  posts_published,
  notes: null,
  created_by: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
});

// The <div> holding one stat tile (label + value + change line).
// Scoped to the stat strip: "Reach" is also a table column header.
const tile = (label: string) => within(document.querySelector("dl")!).getByText(label).parentElement!;

describe("ResultsView month-on-month change", () => {
  it("compares only platforms present in both months", () => {
    render(
      <ResultsView
        reports={[
          report("2026-08-01", "instagram", 1000, 5000, 2.0, 10),
          report("2026-09-01", "instagram", 1100, 5500, 2.5, 12),
          // New channel this month: must not count as growth.
          report("2026-09-01", "tiktok", 5000, 20000, 8.0, 30),
        ]}
      />,
    );

    const followers = tile("Total followers");
    // Headline still totals every platform this month...
    expect(within(followers).getByText((6100).toLocaleString())).toBeInTheDocument();
    // ...but the change is Instagram-only: 1000 -> 1100, not 1000 -> 6100 (+510%).
    expect(within(followers).getByText("▲ 10.0% vs last month")).toBeInTheDocument();
    expect(within(tile("Reach")).getByText("▲ 10.0% vs last month")).toBeInTheDocument();
    expect(within(tile("Posts published")).getByText("▲ 20.0% vs last month")).toBeInTheDocument();
  });

  it("shows engagement change in points, not percent", () => {
    render(
      <ResultsView
        reports={[
          report("2026-08-01", "instagram", 1000, 5000, 2.0, 10),
          report("2026-09-01", "instagram", 1000, 5000, 2.5, 10),
          report("2026-09-01", "tiktok", 1000, 5000, 9.0, 10),
        ]}
      />,
    );
    const engagement = tile("Avg engagement");
    // Headline averages all platforms: (2.5 + 9.0) / 2.
    expect(within(engagement).getByText("5.8%")).toBeInTheDocument();
    // Change uses shared platforms only: 2.5 - 2.0 = +0.5 points (not +25%).
    expect(within(engagement).getByText("▲ 0.5 pts vs last month")).toBeInTheDocument();
  });

  it("shows declines with a down arrow", () => {
    render(
      <ResultsView
        reports={[report("2026-08-01", "linkedin", 2000, 1000, 3.0, 8), report("2026-09-01", "linkedin", 1500, 1000, 2.7, 8)]}
      />,
    );
    expect(within(tile("Total followers")).getByText("▼ 25.0% vs last month")).toBeInTheDocument();
    expect(within(tile("Avg engagement")).getByText("▼ 0.3 pts vs last month")).toBeInTheDocument();
  });

  it("shows no change line when no platform appears in both months", () => {
    render(<ResultsView reports={[report("2026-08-01", "instagram", 1000, 1, 1, 1), report("2026-09-01", "tiktok", 9000, 1, 1, 1)]} />);
    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it("shows no change line with a single month of data", () => {
    render(<ResultsView reports={[report("2026-09-01", "instagram", 1000, 1, 1, 1)]} />);
    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });
});
