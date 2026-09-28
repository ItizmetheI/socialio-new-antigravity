-- ============================================================================
-- Size and format limits on the two public (signed-out) insert tables.
-- Anyone on the internet can insert here, so the database itself caps what
-- gets stored rather than trusting the form. Run after schema_contact.sql and
-- schema_newsletter.sql. Limits match the maxLength on the site's forms.
-- ============================================================================

alter table public.contact_submissions
  add constraint contact_name_len check (char_length(btrim(name)) between 1 and 200),
  add constraint contact_email_len check (char_length(email) <= 320),
  add constraint contact_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add constraint contact_company_len check (company is null or char_length(company) <= 200),
  add constraint contact_service_len check (service is null or char_length(service) <= 100),
  add constraint contact_budget_len check (budget is null or char_length(budget) <= 100),
  add constraint contact_message_len check (char_length(btrim(message)) between 1 and 5000);

alter table public.newsletter_signups
  add constraint newsletter_email_len check (char_length(email) <= 320),
  add constraint newsletter_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Stored lowercased and trimmed so the unique constraint catches
  -- "Name@x.com" vs "name@x.com" (src/lib/newsletter.ts normalizes first).
  add constraint newsletter_email_normalized check (email = lower(btrim(email)));
