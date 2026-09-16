# Data model

The tables that exist right now, why they're shaped this way, and how they
relate — not a speculative future schema. See `SECURITY.md` for the RLS/
authorization side of this. Source of truth: `supabase/schema.sql` (the
original dashboard schema) and `supabase/schema_commerce.sql` (Phase 1,
additive on top).

## Identity

```
organizations (id, name, stripe_customer_id, status, created_at)
profiles      (id = auth.users.id, org_id, role, full_name, is_active, created_at)
```

`profiles` is one row per authenticated user on **both** sides — any number
of people at a client's business share one `org_id`; any number of Socialio
staff each have their own `internal`/`admin` login with `org_id = null`.
Every FK elsewhere that points at `profiles.id` is what makes an action
individually traceable back to a person, not just an org.

`organizations.status` (`prospect` → `active` → `paused`/`canceled`) is the
source of truth for "has this org ever paid" — deliberately separate from
`profiles.is_active`, which means staff deactivation, a different concept.
`status` can only be changed by the service-role webhook handlers (see
`SECURITY.md`).

## Commerce (Phase 1)

```
orders        (id, org_id, created_by, status, amount_subtotal, amount_total,
               stripe_checkout_session_id, stripe_customer_id,
               stripe_subscription_id, paid_at)
order_items   (id, order_id, service_id, tier_label, item_type,
               billing_interval, unit_amount, quantity)
subscriptions (id, org_id, order_id, stripe_subscription_id, status,
               current_period_end, cancel_at_period_end)
payments      (id, org_id, order_id, subscription_id,
               stripe_payment_intent_id, stripe_invoice_id, status, amount)
stripe_events (id = Stripe event id, type, payload, received_at)
```

`order_items.service_id`/`tier_label` reference `src/data/services.ts` by
string id, the same pattern `proposal_items` already used — there is no
`services` table; pricing has exactly one source of truth (the static data
file the pricing pages render from), and `create-checkout-session` resolves
every cart line against it server-side.

`stripe_events` is both the idempotency ledger (its `id` is the Stripe event
id, unique PK, `insert ... on conflict do nothing`) and a de facto
append-only payment audit trail — no card data, since Stripe Checkout being
hosted means this app's webhook payloads never contain a PAN/CVC.

Money is always `integer` cents. Never `numeric`/`float` for a commerce
amount — `proposals.total_price`/`proposal_items.price` (the older,
pre-commerce tables) are the one place `numeric(10,2)` dollars still
appears; new tables don't repeat that.

## Production tracking (pre-existing, unchanged by Phase 1)

```
proposals      (id, org_id, created_by, status, total_price, responded_at)
proposal_items (id, proposal_id, service_id, tier_label, price)
requests       (id, org_id, proposal_item_id, title, stage, assigned_to,
                created_by, due_date)
deliverables   (id, request_id, file_path, uploaded_by)
comments       (id, request_id, author_id, body, visibility)
```

`proposals` was the *pre-purchase* approval gate in the original product
shape (client → proposal → approve → work starts). Phase 1 doesn't touch
these tables or their rows — Phase 3 (not yet built) adds a separate
`plans`/`plan_items`/`plan_feedback` domain for the *post-purchase* curated
plan the new product shape actually needs, and new orgs route through that
instead once it ships. `requests`/`deliverables`/`comments` (the production
Kanban) are reused as-is by both the old and new flow — a request is a
request regardless of what approved it.

`requests.stage` is a plain `CHECK`, not a configurable pipeline — nobody's
asked for per-client pipelines, and a 4-stage flow (`requested` →
`in_progress` → `review` → `delivered`) matches what the marketing site
already promises.

## Cascade shape

Every table ultimately traces back to `organizations(id) on delete cascade`
— directly (`orders`, `proposals`, `requests`) or transitively
(`order_items` → `orders`, `proposal_items` → `proposals`,
`deliverables`/`comments` → `requests`). Deleting a test org cleans up
everything under it in one statement; this is also why
`scripts/verify_rls.mjs`'s cleanup is just "delete the two test orgs," not a
table-by-table teardown.

## What's deliberately *not* here yet

Sketched in `steady-crafting-wren.md` but not built — don't assume these
exist:

- `client_onboarding` / `onboarding_assets` (Phase 2)
- `plans` / `plan_items` / `plan_feedback` (Phase 3, the post-purchase
  approval gate replacing `proposals` for new orgs)
- `calendar_events` / `activity` (Phase 4)
- `notifications` / `prospects` / `outreach` / `outreach_activity` (Phase 5)
- `videos` / `video_metrics` / `audience_metrics` (Phase 6 — blocked on a
  platform-API integration decision, not just schema work)
