// Commerce amounts are stored as integer cents (see schema_commerce.sql).
export function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Date-only columns (due_date) come back as "2026-09-30", which `new Date`
// parses as UTC midnight — that renders as Sept 29 anywhere west of UTC.
// Parse those as local midnight instead.
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value).toLocaleDateString();
}

// The viewer's calendar date as "YYYY-MM-DD", for comparing against date-only
// columns. toISOString() would give the UTC date, a day ahead in the evening
// across the Americas.
export function localDateString(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
