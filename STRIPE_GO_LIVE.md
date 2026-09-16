# Stripe go-live checklist

Everything needed to finish Phase 1 (the purchase spine) once Stripe
credentials exist. The backend is fully built, deployed, and tested against
the live Supabase project — this is a short list of remaining steps, not a
build task. See `steady-crafting-wren.md` (the governing plan) and
`SECURITY.md` for the full design/rationale behind any of this.

## What's already done (don't rebuild)

- `orders`/`order_items`/`subscriptions`/`payments`/`stripe_events` tables,
  live, RLS-verified (28 automated checks across
  `scripts/verify_rls.mjs` + `scripts/verify_webhook_idempotency.mjs`)
- `create-checkout-session` Edge Function — verifies the caller, resolves
  every cart line server-side against `src/data/services.ts` (never trusts
  a client-submitted price), creates the org on first purchase, rolls back
  the order (not the org) if Stripe session creation fails
- `stripe-webhook` Edge Function — verifies the Stripe signature, routes to
  one `SECURITY DEFINER` SQL function per event type, fully idempotent
  (verified: replaying the same event id is a no-op, no duplicate payment)
- Frontend: `/checkout`, `/checkout/success`, `/app/signup`,
  `/app/forgot-password`, `/app/reset-password` all built and browser-tested
- Cart persists to `localStorage`

## What's NOT done — genuinely needs your input first

1. **A Stripe account**, with test-mode keys to start
   (`sk_test_...`, `whsec_...` from a registered webhook endpoint)
2. **The production domain** this will actually deploy to (needed for
   `SITE_URL` and for Stripe's `success_url`/`cancel_url`)
3. **An SMTP provider** (Resend, Postmark, SES, etc.) — Supabase's built-in
   email is rate-limited to a few sends/hour and already rejects synthetic
   test domains; fine for what's been tested, not for real signup/invite
   volume. This is an account/billing choice, not made unilaterally.

## The actual steps, once you have those three things

```bash
# 1. Set the real secrets (replaces the placeholder values a redirect from
#    "keep going" would otherwise try to set — see note below)
npx supabase secrets set \
  STRIPE_API_KEY=sk_test_... \
  STRIPE_WEBHOOK_SIGNING_SECRET=whsec_... \
  SITE_URL=https://your-real-domain.com \
  --project-ref arihkzzgylfmcqgdzjqf
```

2. In the Stripe dashboard (test mode), register a webhook endpoint pointing
   at `https://arihkzzgylfmcqgdzjqf.supabase.co/functions/v1/stripe-webhook`,
   subscribed to at least: `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy its signing secret into step 1.

3. **Full manual test-mode purchase**, before touching the cart CTA:
   - Sign up a fresh test account (or use an existing client)
   - Add a service + an addon to the cart (exercises both `subscription` and
     `payment` Stripe modes in one order)
   - Hit `create-checkout-session` directly (e.g. via the browser console or
     a quick script) since the UI doesn't link to `/checkout` yet
   - Complete Stripe Checkout with test card `4242 4242 4242 4242`
   - Confirm: `orders.status` flips to `paid`, `organizations.status` flips
     to `active`, a `subscriptions` row appears, `payments` has exactly one
     row, `stripe_events` has exactly one row for that event
   - Try replaying the same webhook event from the Stripe dashboard's
     "resend" feature — confirm no duplicate payment row

4. Extend `schema_commerce.sql`'s manual checklist (still `[ ]`) with the
   results — specifically the two items that need real Stripe to test:
   *signed-out visitor rejected*, *fabricated price rejected*. (The
   underlying logic for both is already in place — `create-checkout-session`
   checks auth before touching Stripe, and resolves price from
   `src/data/services.ts` before ever calling Stripe — this step is
   confirming it end to end, not building it.)

5. **The actual go-live commit** — flip `CartDrawer.tsx`'s CTA:
   ```diff
   - <Link to="/contact" ...>
   + <Link to="/checkout" ...>
   ```
   and remove the "No payment required right now" copy beneath it. This is
   deliberately the very last step and deliberately a one-line diff — easy
   to revert on its own if something's wrong post-launch.

6. Once test mode is confirmed clean end to end: create live-mode Stripe
   keys, register a second (live) webhook endpoint, `supabase secrets set`
   the live values over the test ones, redeploy nothing (secrets take effect
   immediately) — then repeat one real purchase with a real card to confirm
   before calling it launched.

## Also still open (not Phase-1-blocking, but adjacent)

- **Cloudflare env vars**: if the Cloudflare Pages deployment still shows
  "failed to fetch" on login, `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  need to be set in Cloudflare Pages → Settings → Environment variables,
  then redeploy (Vite bakes them in at build time — adding them alone
  doesn't retroactively fix an already-built bundle).
- **CSP header**: `public/_headers` has a commented-out draft, deliberately
  not enabled — needs testing against a real deploy (this site embeds Mux
  video; a wrong CSP silently breaks playback) before it ships.
- **CORS on Edge Functions**: currently `Access-Control-Allow-Origin: *`
  (matches the pre-existing convention) — tighten to the real production
  origin once one exists.
- **Real LinkedIn URL**: `src/components/Footer.tsx:58` links to the bare
  `linkedin.com` homepage instead of the real company page — needs the
  actual URL, can't be guessed.
