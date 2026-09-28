// Supabase Storage rejects keys with accents, en dashes, #, %, [ ] and the
// like ("InvalidKey") — so "Brand Guide – 2024.pdf" or "logo é.png" failed to
// upload. Strip accents, then swap anything outside a safe ASCII set for "-".
export function safeFileName(fileName: string) {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.() -]+/g, "-")
    .replace(/-{2,}/g, "-")
    .trim();
  const name = cleaned.replace(/^[-\s]+/, "");
  // A name that was all non-Latin ("日本語.txt") is left as just ".txt".
  return !name || name.startsWith(".") ? `file${name}` : name;
}

export function storagePathFor(orgId: string, folder: string, fileName: string) {
  return `${orgId}/${folder}/${Date.now()}-${safeFileName(fileName)}`;
}
