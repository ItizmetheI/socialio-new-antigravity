-- ============================================================================
-- Client review loop: a client may approve work that's in review
-- (review -> delivered) or send it back (review -> in_progress). Every other
-- stage move, and assignee/due date/org/creator, stays staff-only.
-- Replaces protect_request_columns() from schema.sql; run after it.
-- ============================================================================

create or replace function public.protect_request_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- service_role (edge functions / admin scripts) is trusted server code, same
  -- exemption as protect_profile_columns.
  if not public.is_staff() and auth.role() <> 'service_role' then
    if new.stage is distinct from old.stage
      and not (old.stage = 'review' and new.stage in ('delivered', 'in_progress')) then
      raise exception 'not permitted to change this field';
    end if;
    if new.assigned_to is distinct from old.assigned_to
      or new.due_date is distinct from old.due_date
      or new.org_id is distinct from old.org_id
      or new.created_by is distinct from old.created_by then
      raise exception 'not permitted to change this field';
    end if;
  end if;
  return new;
end;
$$;
