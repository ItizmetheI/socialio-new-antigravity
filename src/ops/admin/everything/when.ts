// "Sep 30, 2026, 3:14 PM" — the admin page always shows the exact moment.
export function fullWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

// "Tuesday, Sep 30, 2026" for day headings in the timeline.
export function dayHeading(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}
