import { describe, expect, it } from "vitest";
import { formatCents, formatDate, formatDollars, localDateString, timeAgo } from "./format";

describe("test environment", () => {
  it("runs west of UTC so date-only bugs surface", () => {
    // New York in January is UTC-5 (300 minutes).
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(300);
  });
});

describe("formatCents", () => {
  it("formats integer cents as dollars with two decimals", () => {
    expect(formatCents(9990)).toBe("$99.90");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(123456)).toBe("$1,234.56");
  });

  it("accepts a lowercase currency code (as Stripe stores it)", () => {
    expect(formatCents(1050, "eur")).toBe("€10.50");
  });
});

describe("formatDollars", () => {
  it("keeps trailing zeros", () => {
    expect(formatDollars(99.9)).toBe("$99.90");
    expect(formatDollars(1500)).toBe("$1,500.00");
  });
});

describe("formatDate", () => {
  it("renders a placeholder for empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("does not shift a date-only value back a day west of UTC", () => {
    expect(formatDate("2026-09-30")).toBe(new Date(2026, 8, 30).toLocaleDateString());
    expect(formatDate("2026-09-30")).not.toBe(new Date(2026, 8, 29).toLocaleDateString());
    // Year boundary: Jan 1 must not become Dec 31 of the previous year.
    expect(formatDate("2027-01-01")).toBe(new Date(2027, 0, 1).toLocaleDateString());
  });

  it("renders full timestamps in the viewer's local day", () => {
    // 02:00 UTC on Oct 1 is still Sept 30 in New York.
    expect(formatDate("2026-10-01T02:00:00Z")).toBe(new Date(2026, 8, 30).toLocaleDateString());
  });
});

describe("localDateString", () => {
  it("returns the local calendar date, not the UTC one", () => {
    // 11:30pm local on Sept 30 is already Oct 1 in UTC.
    expect(localDateString(new Date(2026, 8, 30, 23, 30))).toBe("2026-09-30");
  });

  it("zero-pads month and day", () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-09-28T12:00:00Z").getTime();
  it("reads naturally at each scale", () => {
    expect(timeAgo("2026-09-28T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-09-28T11:55:00Z", now)).toBe("5m ago");
    expect(timeAgo("2026-09-28T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-09-26T12:00:00Z", now)).toBe("2d ago");
  });
  it("never shows negative times for clock skew", () => {
    expect(timeAgo("2026-09-28T12:00:30Z", now)).toBe("just now");
  });
});
