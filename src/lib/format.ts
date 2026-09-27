// Commerce amounts are stored as integer cents (see schema_commerce.sql).
export function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "—";
}
