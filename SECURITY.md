# Security architecture

What's actually true about this system's security posture, kept in sync
with the code — not an aspirational checklist. See `DATA_MODEL.md` for the
schema/ownership side of this.

## Authentication

Supabase Auth only — no custom password handling anywhere in this repo.
`src/lib/auth/AuthContext.tsx` wraps `signInWithPassword`, `signUp`,
`resetPasswordForEmail`, `signOut`. Sessions are Supabase's own JWT-bearer
tokens; there is no custom cookie/session mechanism to secure.

## Authorization

Three roles on `profiles.role`: `client`, `internal`, `admin`. Every
authorization decision is centralized in four `SECURITY DEFINER STABLE`
Postgres functions (`supabase/schema.sql`) — `my_role()`, `my_org_id()`,
`is_staff()`, `is_admin()` — called from every RLS policy. There is no
scattered `if (user.email === ...)` logic anywhere in the frontend; the
frontend's `RequireRole` component (`src/lib/auth/RequireRole.tsx`) gates
*navigation*, not data access — the actual authorization boundary is always
Postgres RLS, never the React tree.

## Row Level Security

**Every** table has RLS enabled — `organizations`, `profiles`, `proposals`,
`proposal_items`, `requests`, `deliverables`, `comments`,
`orders`, `order_items`, `subscriptions`, `payments`, `stripe_events`. RLS
alone isn't enough for `profiles`/`proposals`/`requests` — a `USING` clause
can't see *which column* changed, so those tables also have `BEFORE UPDATE`
triggers (named `trg_1_*`, firing before any `trg_2_*` side-effect trigger)
that reject privileged-column changes from non-staff callers.

Every commerce table (`orders`/`order_items`/`subscriptions`/`payments`) is
**SELECT-only** for the browser — clients see their own org's rows, staff
see everything, nobody gets client-side INSERT/UPDATE/DELETE. All writes go
through `create-checkout-session`/`stripe-webhook` using the service-role
key, which bypasses RLS entirely. `stripe_events` has **no grant at all** to
`anon`/`authenticated` — not even staff can read it from the browser.

Defense in depth: `revoke all ... from anon, authenticated` runs before
every `grant`, so a table with RLS enabled but an accidentally-missing
policy fails closed (no access) rather than open.

**Verified, not assumed**: `scripts/verify_rls.mjs` (21 checks) and
`scripts/verify_webhook_idempotency.mjs` (7 checks) run against the live
project and check this directly — cross-org isolation by ID guessing, every
column-protection trigger, the proposal-approval → auto-created-request
side effect, self-escalation rejection, and idempotent webhook replay. Run
them after any RLS/schema/Edge-Function change; both scripts print exactly
what they checked and clean up their own test data.

## Metadata trust boundary

`auth.users.raw_user_meta_data` (`user_metadata`) is client-settable via the
public `signUp()` call — `AuthContext.signUp` only ever puts `full_name`
there. `role`/`org_id` live in `raw_app_meta_data` (`app_metadata`),
settable only via the service-role admin API. **Known timing gotcha**:
Supabase's GoTrue applies admin-supplied `app_metadata` to `auth.users` in a
step *after* the initial row insert, so `trg_handle_new_user`'s
`AFTER INSERT` trigger never sees it — `invite-client`
(`supabase/functions/invite-client/index.ts`) does an explicit follow-up
`profiles` UPDATE for exactly this reason. Found and fixed by testing, not
review — see `scripts/verify_rls.mjs`'s git history. Any future code path
that provisions a profile with a non-default role/org must follow the same
explicit-UPDATE pattern, not rely on the trigger picking up `app_metadata`.

## Payment integrity

`create-checkout-session` (`supabase/functions/create-checkout-session/index.ts`)
never trusts a client-submitted price — every cart line is resolved
server-side against `src/data/services.ts`, the same file the pricing pages
render from. `stripe-webhook` verifies the Stripe signature
(`constructEventAsync` + `SubtleCrypto`, required in Deno) before touching
anything, then hands the raw event to one `SECURITY DEFINER` SQL function
per event type. All state transitions and the idempotency check
(`stripe_events` unique-PK-insert-first) live in Postgres, so a partial JS
failure in the Edge Function can never half-apply a payment. Money columns
are always `integer` cents, never float.

`trg_1_protect_organization_columns` blocks any non-service-role UPDATE to
`organizations.stripe_customer_id`/`status` — not even an admin can hand-edit
these from the UI; only the webhook-driven SQL functions may.

## Secrets

`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `SITE_URL` are set via
`supabase secrets set` and read only via `Deno.env.get()` inside
`supabase/functions/*` — never `VITE_`-prefixed, never in a tracked file.
`.env` is gitignored (`git check-ignore -v .env` confirms it). Before every
push that touched credentials this session, all unpushed commit diffs were
grepped for the literal secret strings.

## Known gaps — not silently omitted, just not built yet

- **CORS**: Edge Functions currently allow `Access-Control-Allow-Origin: *`
  (matching the pre-existing `invite-client` convention). Should be
  tightened to the production origin once one is confirmed — see
  `public/_headers` for the same "needs a real domain" note on CSP.
- **Rate limiting**: Supabase Auth has its own built-in limits on
  sign-in/sign-up/password-reset (project-level, not app-configurable).
  Cloudflare (the hosting layer) can add rate-limiting rules for
  `/checkout`, `/app/signup`, `/app/forgot-password` — not configured yet,
  needs the Cloudflare dashboard.
- **Audit log**: `stripe_events.payload` is a de facto append-only payment
  audit trail (locked by zero-grant RLS), but there's no general audit log
  for plan approvals / admin actions yet — that's Phase 5 scope per
  `steady-crafting-wren.md`.
- **Pagination**: no admin list view in this codebase is unbounded yet
  (Phase 1 added none), but this needs an explicit audit once Phase 5's
  admin `orders`/`payments` views are built.
- **File uploads**: the private `deliverables` Storage bucket's RLS
  (org-scoped path prefix, no public bucket) is the template Phase 2's
  `onboarding_assets` will reuse — not itself a new surface, but not yet
  security-tested by the scripts above.
- **No independent security review has been done.** This document
  describes the mechanisms actually in the code, not a compliance claim.
  Stripe Checkout being hosted (never touching raw card data in this app)
  reduces PCI scope but doesn't eliminate the value of a real review before
  onboarding paying clients at scale.
