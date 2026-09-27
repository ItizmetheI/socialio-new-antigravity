// Uploads files with real-world awkward names through the app's own
// storagePathFor() to the live bucket, then deletes them. Catches the
// "InvalidKey" rejections Supabase Storage gives accents, en dashes, #, %, [].
// Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node --experimental-strip-types scripts/verify_upload_names.mjs
import { storagePathFor } from "../src/lib/storagePath.ts";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY");

const NAMES = [
  "plain.png", "Brand Guide – 2024.pdf", "logo é.png", "file#1.png", "50% off.png",
  "photo [1].jpg", "Café Menü (final).PDF", "émoji 🎉.png", "日本語.txt", "...hidden", "a?b&c.png",
];
const headers = { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY };
const objectUrl = (path) => `${SUPABASE_URL}/storage/v1/object/deliverables/${path.split("/").map(encodeURIComponent).join("/")}`;

let failed = 0;
const created = [];
for (const name of NAMES) {
  const path = storagePathFor("zz-verify-upload-names", "onboarding", name);
  const res = await fetch(objectUrl(path), { method: "POST", headers: { ...headers, "Content-Type": "text/plain" }, body: "x" });
  if (res.ok) created.push(path);
  else failed++;
  console.log(`${res.ok ? "PASS" : "FAIL"}  ${JSON.stringify(name)} -> ${path.split("/").pop()}${res.ok ? "" : "  " + (await res.text()).slice(0, 80)}`);
  await new Promise((r) => setTimeout(r, 2)); // distinct Date.now() per path
}

const del = await fetch(`${SUPABASE_URL}/storage/v1/object/deliverables`, {
  method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: created }),
});
console.log(`cleanup: ${del.status}, removed ${created.length}`);
console.log(failed ? `${failed} FAILED` : `${NAMES.length}/${NAMES.length} passed`);
process.exit(failed ? 1 : 0);
