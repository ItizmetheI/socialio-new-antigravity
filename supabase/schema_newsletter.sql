-- ============================================================================
-- Newsletter signups — additive, unrelated to commerce/dashboard schemas.
-- ============================================================================
-- Footer.tsx's newsletter form previously showed "You're in, growth
-- incoming" after only setting local component state — nothing was ever
-- captured. This table + the matching Footer.tsx change make that real.

create table public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups enable row level security;
revoke all on public.newsletter_signups from anon, authenticated;

-- Public form, no auth required — anyone can submit their email. Nobody
-- (not even a signed-in client/staff via the browser) can read the list;
-- staff use the Supabase dashboard directly for that, same boundary as
-- every other write-only/staff-only surface in this schema.
grant insert on public.newsletter_signups to anon, authenticated;

create policy "anyone can sign up" on public.newsletter_signups
  for insert to anon, authenticated with check (true);
