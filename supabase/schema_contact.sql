-- ============================================================================
-- Contact form submissions — additive, unrelated to commerce/dashboard schemas.
-- ============================================================================
-- Designed earlier in plans/01-hero-cleanup-and-supabase-integration.md
-- (Phase 2), but never actually run — that plan paused before Supabase
-- access existed and was never resumed once it did. Found via a dead-click/
-- false-affordance audit: Contact.tsx's handleSubmit only ever set local
-- "success" state — every submitted lead was silently discarded.

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
revoke all on public.contact_submissions from anon, authenticated;

-- Public form, no auth required. Insert-only — no select/update/delete
-- grant to anon/authenticated, same write-only boundary as
-- newsletter_signups; staff read via the Supabase dashboard directly.
grant insert on public.contact_submissions to anon, authenticated;

create policy "anyone can submit" on public.contact_submissions
  for insert to anon, authenticated with check (true);
