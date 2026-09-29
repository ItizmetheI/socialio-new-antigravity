-- ============================================================================
-- Admin-only account directory for the "Everything" page.
--
-- Emails, confirmation and last-sign-in times live in auth.users, which the
-- browser can't read. This SECURITY DEFINER function returns them joined to
-- profiles — but only to an ACTIVE ADMIN: it checks is_admin() itself and
-- raises for anyone else, so granting EXECUTE to authenticated is safe
-- (anon has no grant at all). Run after schema_security_audit.sql.
-- ============================================================================

create or replace function public.admin_user_directory()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  org_id uuid,
  is_active boolean,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  providers text[]
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
    select
      p.id,
      u.email::text,
      p.full_name,
      p.role,
      p.org_id,
      p.is_active,
      p.created_at,
      u.email_confirmed_at,
      u.last_sign_in_at,
      coalesce(
        array(select jsonb_array_elements_text(u.raw_app_meta_data -> 'providers')),
        array[]::text[]
      )
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke execute on function public.admin_user_directory() from public, anon;
grant execute on function public.admin_user_directory() to authenticated;
