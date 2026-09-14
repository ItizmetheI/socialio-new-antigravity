# Plan: Hero cleanup, Supabase contact form, video hosting fix

Repo: `kb-growth-feedbird--main` (Socialio marketing site). Each phase below is
self-contained — a fresh session can execute it from this doc alone without
re-reading the others. Do the phases in order; later phases assume earlier
ones landed.

## Status (updated 2026-09-14)

- **Phase 1 — done.** `Home.tsx` hero refactor finished, dead code removed
  (`HeroCarousel`, `col1-3Items`, `CarouselCard`, `HoverOverlay`,
  `SpotlightCard.tsx`, `TextReveal.tsx` — the latter was found dead by the
  same audit, not originally called out by name — and the 3 stray debug
  scripts). `npm run lint` and `npm run build` both pass clean.
- **Prerequisite bug fixes landed** (found while starting Phase 3, kept
  because they're plain correctness fixes independent of any Supabase
  feature work): added missing `src/vite-env.d.ts` (the project was missing
  Vite's client type reference, so `import.meta.env` didn't type-check —
  this made `npm run lint` fail even before any of this plan's changes);
  guarded `src/lib/supabase.ts` so `createClient()` doesn't throw at import
  time when `.env` still has placeholder values (confirmed via a Node
  repro: it throws `Invalid supabaseUrl` today). Neither change queries
  Supabase or requires real credentials.
- **Phases 2-4 — paused.** Client hasn't granted Supabase project access
  yet. Do not create the schema, do not wire the Contact form, do not touch
  Storage until that access exists. Revisit this plan once credentials land
  in `.env` (currently still `"your-project-url"` / `"your-anon-key"`
  placeholders).

## Scope

1. Finish the in-progress `Home.tsx` hero refactor and delete the dead code it left behind.
2. Stand up a minimal Supabase "stage 1" schema (`contact_submissions`).
3. Wire the Contact page form to actually insert into Supabase.
4. Replace the fragile, expiring Streamable CDN video URLs with stable Supabase Storage URLs.
5. Final verification pass.

## Explicitly out of scope (skip; add only if asked)

- New DB tables beyond `contact_submissions` (no `cart_orders`, no `newsletter_signups` — nothing currently reads/writes them).
- A form library (React Hook Form etc.) for Contact — the existing `useState` form is small and already validates required fields.
- A server/API route — this is a static Vite SPA; Supabase's anon-key + RLS pattern is the direct client-side path already provisioned.
- A third-party video CDN (Mux, Cloudflare Stream, Bunny) — Supabase Storage is already the provisioned backend and the clips are small (2-13MB).
- Removing the stray `express`/`dotenv`/`tsx` deps and the `clean` script's `server.js` reference in `package.json` — leftover from a removed backend, harmless, not touched by this plan.
- Cross-page video pause-coordination (`ActiveVideoProvider`) on `ServiceDetail.tsx` — it's not wrapped there today (only guarded home carousel, which Phase 1 deletes). Multiple videos can technically autoplay-on-click independently; add coordination only if that's a real UX complaint.

---

## Phase 0: Documentation findings (Supabase JS v2.116.0)

Verified against `node_modules/@supabase/postgrest-js/dist/index.d.mts`,
`node_modules/@supabase/storage-js/dist/index.d.mts`, and
supabase.com/docs (fetched live). Use only these shapes — do not invent
methods or parameters.

**Insert / select**
```ts
const { data, error } = await supabase
  .from('table_name')
  .insert({ col: val })   // one row = object; bulk = array of objects
  .select()                 // REQUIRED to get the inserted row(s) back — omitting it returns data: null
```
- Error shape: `PostgrestError { message, details, hint, code }`.
- Bulk insert is one transaction — any row failing fails all.
- Source: `postgrest-js/dist/index.d.mts:4386-4469`; supabase.com/docs/reference/javascript/insert.

**RLS (row level security)** — minimum policy for anon INSERT-only:
```sql
alter table public.contact_submissions enable row level security;

create policy "anon can insert"
on public.contact_submissions
for insert
to anon
with check (true);

-- defense in depth: grants gate the operation, policies gate the rows
revoke all on table public.contact_submissions from anon, authenticated;
grant insert on table public.contact_submissions to anon;
```
Not defining SELECT/UPDATE/DELETE policies denies those by default once RLS
is on. Source: supabase.com/docs/guides/database/postgres/row-level-security.

**Storage**
```ts
await supabase.storage.from('videos').upload('clip1.mp4', file, { cacheControl: '3600', upsert: false });
const { data } = supabase.storage.from('videos').getPublicUrl('clip1.mp4'); // sync, { publicUrl }, no expiry param
```
`getPublicUrl` takes no `expiresIn` — it's the non-expiring form (contrast
with `createSignedUrl(path, expiresIn, ...)`, which does expire — that's
the bug we're fixing). Bucket must be marked public (dashboard or
`updateBucket`). Source: `storage-js/dist/index.d.mts:1025-1619`.

**Anti-patterns to avoid**
- Forgetting `.select()` after insert (silently returns `data: null`).
- `upsert` defaults to `false` — re-uploading to the same Storage path without `upsert: true` errors.
- Shipping a table with RLS enabled but no policies is fine (denies all) — shipping a table with RLS *disabled* is not (world-writable via the public anon key).

---

## Phase 1: Finish hero refactor, delete dead code

**Files**: `src/pages/Home.tsx`, `src/components/SpotlightCard.tsx` (delete),
`src/checkEmbed.ts` / `src/testCors.ts` / `src/testRaw.ts` (delete).

**Context**: `git status` shows an uncommitted, in-progress edit to
`Home.tsx` that replaces the old asymmetric hero (with a background video
carousel) with a centered "Linear-style" hero + static screenshot panel, and
flattens the "How it Works" / portfolio sections into bento cards. Keep this
work — do not revert it. Finishing it just means cleaning up what it left
behind.

**Steps**
1. In `Home.tsx`, confirm the new centered hero (the `<section>` starting
   `{/* High-Impact Centered Hero Section */}`) no longer renders
   `<HeroCarousel />` anywhere in the file.
2. Delete the now-unreachable code in `Home.tsx`: the `HeroCarousel`
   function, `col1Items`/`col2Items`/`col3Items` arrays, the `CarouselCard`
   component, the `HoverOverlay` component, and the
   `ActiveVideoProvider, useActiveVideo` import from `../context/VideoContext`
   (grep the file first to confirm none of these names are referenced
   anywhere else in it before deleting).
3. Delete `src/components/SpotlightCard.tsx` — confirmed zero importers
   (`grep -rn "SpotlightCard" src/` matches only its own file).
4. Delete `src/checkEmbed.ts`, `src/testCors.ts`, `src/testRaw.ts` — one-off
   Node scripts used to discover the Streamable CDN URLs, not imported by
   the app, and fully superseded once Phase 4 lands.
5. Do **not** delete `src/context/VideoContext.tsx` — `CustomPlayer.tsx`
   still calls `useActiveVideo()`, and `ServiceDetail.tsx` still renders
   multiple `CustomPlayer` instances in its "Recent Showcase" marquee.

**Verification**
- `grep -rn "HeroCarousel\|SpotlightCard\|ActiveVideoProvider" src/` → no
  remaining references outside `VideoContext.tsx`'s own definition.
- `npm run lint` (runs `tsc --noEmit`) passes clean.
- `npm run build` succeeds.
- `npm run dev` → homepage hero renders the new centered layout, no console
  errors about missing imports.

**Anti-pattern guards**: don't revert the in-flight redesign back to the old
asymmetric hero; don't delete `VideoContext.tsx` itself.

---

## Phase 2: Supabase schema — `contact_submissions`

**Files**: new `supabase/schema.sql` (tracked in repo, run manually in the
Supabase SQL editor — no Supabase CLI dependency, none is installed and
adding one is out of scope for this).

**Steps**
1. Create `supabase/schema.sql`:
   ```sql
   create table public.contact_submissions (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     name text not null,
     email text not null,
     company text,
     service text,
     budget text,
     message text not null
   );

   alter table public.contact_submissions enable row level security;

   create policy "anon can insert"
   on public.contact_submissions
   for insert
   to anon
   with check (true);

   revoke all on table public.contact_submissions from anon, authenticated;
   grant insert on table public.contact_submissions to anon;
   ```
2. Run it once in the Supabase project's SQL editor (Dashboard → SQL Editor
   → paste → Run).

**Verification**
- Table Editor shows `contact_submissions` with the columns above.
- From a scratch script or browser console using the project's anon key:
  `await supabase.from('contact_submissions').insert({ name: 'test', email: 'a@b.com', message: 'hi' })`
  succeeds with `error: null`.
- `await supabase.from('contact_submissions').select()` (same anon key)
  returns an empty array — proves RLS blocks reads even though the insert
  worked.

**Anti-pattern guards**: don't skip `enable row level security`; don't grant
`select`/`update`/`delete` to `anon`; don't add speculative tables.

---

## Phase 3: Wire the Contact form to Supabase

**Files**: `src/pages/Contact.tsx`.

**Depends on**: Phase 2 (table must exist).

**Steps**
1. Import the existing singleton client: `import { supabase } from "../lib/supabase";` — do not instantiate a new client.
2. Make `handleSubmit` `async`. Keep the existing required-field check
   (`name`/`email`/`message`) exactly as-is — it already runs before any
   network call.
3. Replace the body after validation with:
   ```ts
   const { error: submitError } = await supabase
     .from('contact_submissions')
     .insert({
       name: formData.name,
       email: formData.email,
       company: formData.company,
       service: formData.service,
       budget: formData.budget,
       message: formData.message,
     });

   if (submitError) {
     setError("Something went wrong sending your message. Please try again.");
     return;
   }

   setStatus("success");
   ```
   No `.select()` needed — the UI doesn't use the inserted row's id.
4. Leave the existing success-state UI (the checkmark/"Message sent" block)
   untouched — it already exists and needs no changes.

**Verification**
- `npm run dev`, submit the form with valid data → a new row appears in
  Supabase's Table Editor within a few seconds.
- Temporarily break `VITE_SUPABASE_ANON_KEY` in `.env`, restart dev server,
  submit again → the existing red error text renders (not a silent failure,
  not a crash). Restore the correct key afterward.

**Anti-pattern guards**: no new form library; no server route; don't call
`.select()` unnecessarily.

---

## Phase 4: Move demo videos to Supabase Storage

**Files**: `src/components/CustomPlayer.tsx` (the `directMp4s` map only —
no caller changes needed, since callers key into it with the existing
`streamable.com/...` placeholder strings).

**Steps**
1. In the Supabase dashboard, create a public Storage bucket named `videos`.
2. Identify the 4 source clips. **Needs user confirmation**: the repo's
   parent folder (`C:\Users\ahmed\OneDrive\Desktop\KB grwoth\`, one level
   above this repo) has `UGC 1-4.mp4`, `UGC SC 1-4.mp4`, `instagram 1.mp4`,
   and `social media post 4.mp4` — more candidate files than the 4 URLs
   currently in `directMp4s`. Confirm which 4 map to which of the existing
   keys (`a69bm3`, `30ffri`, `e25yp1`, `e3xzs4`) before uploading, since
   `CustomPlayer.tsx` has no descriptive labels tying them to specific
   creative.
3. Upload the 4 confirmed files to the `videos` bucket (dashboard upload UI,
   or a one-off script using `supabase.storage.from('videos').upload(...)`
   per the Phase 0 API shape).
4. In `src/components/CustomPlayer.tsx`, replace the 4 signed, expiring
   `cdn-cf-east.streamable.com` values in the `directMp4s` map with the new
   `getPublicUrl(...)` results — keep the same 4 `streamable.com/...` keys
   so no caller in `Home.tsx`/`ServiceDetail.tsx` needs to change.

**Verification**
- `grep -rn "cdn-cf-east.streamable" src/` → no matches.
- Confirmed by Phase 1's cleanup: only `ServiceDetail.tsx`'s "Recent
  Showcase" marquee actually renders `CustomPlayer` post-cleanup (Home's
  carousel is gone) — visit a `/service/:id` page, play each clip, confirm
  no 403/404 in the Network tab.

**Anti-pattern guards**: no third-party video CDN; no re-encoding unless
file size is actually a problem (it isn't — clips are 2-13MB).

---

## Final Phase: Verification

1. `npm run lint` (tsc --noEmit) clean.
2. `npm run build` succeeds; `npm run preview` loads with no console errors.
3. Grep sweep confirms all gone: `HeroCarousel`, `SpotlightCard`,
   `cdn-cf-east.streamable`, `checkEmbed`, `testCors`, `testRaw`.
4. Manual smoke test: Contact form submission lands a row in Supabase;
   ServiceDetail showcase videos play; homepage hero renders cleanly at
   375px / 768px / 1440px widths.
5. Confirm `.env` was never committed: `git log --all --full-history -- .env`
   returns nothing (`.gitignore` already excludes `.env*` except
   `.env.example`).
