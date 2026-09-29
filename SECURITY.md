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

## Hardening added 2026-09-28 (all applied live, all regression-tested)

- **Payment handlers locked** (`schema_security_lock_functions.sql`): the
  Stripe handler functions were executable by anyone via `/rest/v1/rpc`
  (Postgres grants EXECUTE to PUBLIC by default) — a visitor could mark
  their own order paid. Now `service_role` only; default privileges on new
  functions tightened.
- **Webhook ordering**: subscription events apply the subscription's
  current state fetched from Stripe, so out-of-order delivery can't roll a
  paid subscription back to `incomplete`. First invoice isn't double-counted
  (`schema_commerce_fix_first_invoice.sql`). Checkout is USD-only.
- **Deactivation revokes access** (`schema_security_audit.sql`):
  `is_staff()`, `is_admin()`, `my_org_id()` require `is_active`; the
  invite and checkout functions refuse deactivated accounts.
- **Uploads**: 50 MB per file, allow-listed file types (no HTML/JS).
- **Public forms**: DB-enforced length/format limits
  (`schema_leads_limits.sql`), per-email and global flood limits, bot
  honeypot on the contact form.
- **CORS**: Edge Functions allow only the site's own origins
  (`supabase/functions/_shared/cors.ts`); Stripe returns customers to the
  origin they paid from.
- **Checkout**: max 20 cart items, prices always resolved server-side.
- **Admin account directory**: emails and sign-in times live in
  `auth.users`, which the browser can't read. `admin_user_directory()`
  (`schema_admin_directory.sql`) returns them only to an active admin — it
  checks `is_admin()` itself and raises 42501 for staff, clients,
  deactivated admins and anon (who has no EXECUTE grant at all).
- **Content-Security-Policy** (`public/_headers`): scripts only from the
  site itself (no inline scripts; the theme bootstrap is
  `public/theme-init.js`), network calls only to our Supabase project, media
  only from the Streamable CDN and Supabase Storage, images from Unsplash,
  no framing, no plugins. An injected `<script>` or a script loaded from
  another domain won't run. Checked against the production build on every
  page type with zero violations. A new third party must be added there.
- **Sign-in**: plain-English errors that don't reveal whether an email is
  registered; a browser-side lockout after every 5th wrong password (30s,
  doubling, max 5 min). The real brute-force limit is Supabase Auth's
  per-IP rate limit; the browser lockout is a courtesy brake.

## Regression suites (run against the live project)

```bash
# SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY in the environment
node scripts/verify_rls.mjs
node scripts/verify_plans_rls.mjs
node scripts/verify_onboarding_rls.mjs
node scripts/verify_leads_and_review.mjs
node scripts/verify_deliverables_access.mjs
node scripts/verify_workspace_rls.mjs
node scripts/verify_ledger_rls.mjs
node scripts/verify_webhook_idempotency.mjs
node scripts/verify_function_lockdown.mjs
node scripts/verify_security_audit.mjs
node scripts/verify_activity_rls.mjs
node --experimental-strip-types scripts/verify_upload_names.mjs
node scripts/verify_admin_directory.mjs
# + STRIPE_SECRET_KEY (sk_test_ only): full test-mode purchase
node scripts/e2e_checkout.mjs start|verify|cleanup
```

Every suite creates throwaway users/orgs and deletes them, pass or fail.

## Known gaps — not silently omitted, just not built yet

- **CAPTCHA on sign-up / sign-in / reset**: not yet — needs a Cloudflare
  Turnstile site key + secret (add `challenges.cloudflare.com` to the CSP's
  `script-src` and `frame-src` when it lands).
- **Rate limiting at the edge**: Supabase Auth has built-in limits;
  Cloudflare rules for `/checkout`, `/app/signup`, `/app/forgot-password`
  aren't configured yet (Cloudflare dashboard).
- **Audit log**: `stripe_events.payload` is an append-only payment trail;
  there's no general audit log for admin actions yet.
- **No independent security review has been done.** This document
  describes the mechanisms actually in the code, not a compliance claim.
