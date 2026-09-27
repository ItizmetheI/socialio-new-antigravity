-- ============================================================================
-- Leads inbox: staff can read contact submissions + newsletter signups, and
-- track follow-up status on contact leads. Additive; run after
-- schema_contact.sql and schema_newsletter.sql.
-- ============================================================================
-- Until now both tables were write-only from the browser ("staff read via the
-- Supabase dashboard directly"), so every lead was stored where nobody using
-- the app could see it. Clients and anonymous visitors stay write-only.

alter table public.contact_submissions
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'closed'));

grant select on public.contact_submissions to authenticated;
grant select on public.newsletter_signups to authenticated;
-- Column-level grant: staff can move a lead through its status, nothing else.
grant update (status) on public.contact_submissions to authenticated;

create policy "staff read contact submissions" on public.contact_submissions
  for select to authenticated using (public.is_staff());

create policy "staff update contact submission status" on public.contact_submissions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff read newsletter signups" on public.newsletter_signups
  for select to authenticated using (public.is_staff());
