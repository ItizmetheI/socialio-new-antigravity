-- ============================================================================
-- Security audit fixes (2026-09-28). Run after every other schema_*.sql.
-- Each section: what was possible before, and the fix.
-- ============================================================================

-- ---- 1. Deactivated accounts kept their access -----------------------------
-- is_staff()/is_admin() checked the role only, and my_org_id() ignored
-- is_active, so switching a teammate (or client user) off in the admin
-- screens changed nothing: they kept full access. Every RLS policy goes
-- through these helpers, so gating them on is_active revokes everything.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('internal', 'admin') and is_active is not false
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active is not false
  )
$$;

create or replace function public.my_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid() and is_active is not false
$$;

-- ---- 2. Uploads had no size or type limit ----------------------------------
-- Anyone allowed to upload (staff; clients into {org}/onboarding) could store
-- a file of any size or type. 50 MB is the project's per-file ceiling on
-- this plan; the list covers images, video, audio, PDFs, office docs, design
-- files, fonts and archives.
update storage.buckets set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/*', 'video/*', 'audio/*',
    'application/pdf', 'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/postscript', 'application/illustrator', 'image/vnd.adobe.photoshop',
    'font/otf', 'font/ttf', 'font/woff', 'font/woff2', 'application/font-sfnt', 'application/x-font-ttf'
  ]
where id = 'deliverables';

-- ---- 3. Public forms could be flooded ---------------------------------------
-- contact_submissions/newsletter_signups take inserts from anyone. Cap how
-- fast: 3 messages per email per hour, 60 contact messages / 100 signups
-- per 10 minutes overall. The error is generic on purpose.
create or replace function public.throttle_public_inserts()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_table_name = 'contact_submissions' then
    if (select count(*) from public.contact_submissions
        where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3
      or (select count(*) from public.contact_submissions where created_at > now() - interval '10 minutes') >= 60 then
      raise exception 'Too many submissions. Please try again later.' using errcode = 'P0429';
    end if;
  elsif tg_table_name = 'newsletter_signups' then
    if (select count(*) from public.newsletter_signups where created_at > now() - interval '10 minutes') >= 100 then
      raise exception 'Too many submissions. Please try again later.' using errcode = 'P0429';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_throttle_contact on public.contact_submissions;
create trigger trg_throttle_contact
  before insert on public.contact_submissions
  for each row execute function public.throttle_public_inserts();

drop trigger if exists trg_throttle_newsletter on public.newsletter_signups;
create trigger trg_throttle_newsletter
  before insert on public.newsletter_signups
  for each row execute function public.throttle_public_inserts();

-- ---- 4. Trigger functions callable directly ---------------------------------
-- Harmless (they return "trigger" so PostgREST won't run them) but locked
-- for consistency with schema_security_lock_functions.sql.
revoke execute on function
  public.stamp_brand_kit(),
  public.set_updated_at(),
  public.set_onboarding_submitted_at(),
  public.set_plan_status_timestamps(),
  public.throttle_public_inserts()
from public, anon, authenticated;
