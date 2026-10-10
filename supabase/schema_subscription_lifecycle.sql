-- ============================================================================
-- Subscription lifecycle: started / cancelling / resumed / ended show up in
-- the activity log (and so in the admin's dashboard notices), and each paid
-- order gets exactly one confirmation email. Run after schema_activity.sql
-- and schema_commerce_fix_repeat_buyer.sql.
--
-- Plans are monthly: a cancellation never refunds or cuts the current month,
-- it only stops the next renewal (Stripe cancel_at_period_end). The trigger
-- fires on real state changes only, so the client's cancel (written by the
-- manage-subscription function) and Stripe's matching webhook a moment later
-- log one event, not two.
-- ============================================================================

alter table public.activity_events drop constraint if exists activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'request_created', 'stage_changed', 'comment_added', 'file_delivered',
  'plan_sent', 'plan_approved', 'plan_changes_requested', 'payment_received',
  'subscription_started', 'subscription_canceling', 'subscription_resumed', 'subscription_ended'
));

-- Set by the stripe-webhook function when it claims the confirmation email,
-- so duplicate or concurrent webhook deliveries can never send it twice.
alter table public.orders add column if not exists confirmation_email_sent_at timestamptz;

-- Display names for the activity log. Keep in step with src/data/services.ts
-- (titles); an unknown id falls back to a tidied version of the id.
create or replace function public.service_title(p_id text)
returns text
language sql immutable set search_path = public
as $$
  select case p_id
    when 'social-media-posts' then 'Social Media Posts'
    when 'short-form-videos' then 'Short-Form Videos'
    when 'ugc-content' then 'UGC Videos'
    when 'seo-blog-posts' then 'Blog Post'
    when 'seo-backlinks' then 'SEO Backlinks'
    when 'instagram-growth' then 'Instagram Growth'
    when 'rush-delivery' then 'Rush Delivery (48h)'
    when 'platform-audit' then 'Platform Strategy Audit'
    else initcap(replace(p_id, '-', ' '))
  end;
$$;

create or replace function public.activity_on_subscription()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_plan text;
  v_cents integer;
  v_until text := coalesce(to_char(new.current_period_end at time zone 'UTC', 'Mon FMDD, YYYY'), 'the end of the paid month');
  v_was_live boolean := tg_op = 'UPDATE' and old.status in ('active', 'trialing', 'past_due', 'unpaid');
begin
  select string_agg(public.service_title(i.service_id) || ' · ' || i.tier_label, ', ' order by i.service_id),
         sum(i.unit_amount * i.quantity)
    into v_plan, v_cents
    from public.orders o join public.order_items i on i.order_id = o.id
   where o.stripe_subscription_id = new.stripe_subscription_id and i.billing_interval = 'month';
  v_plan := coalesce(v_plan || ' (' || to_char(v_cents / 100.0, 'FM$999,999,990.00') || '/month)', 'Monthly plan');

  if new.status in ('active', 'trialing') and not v_was_live then
    perform public.log_activity(new.org_id, 'subscription_started', null, format('New subscription: %s', v_plan));
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'canceled' and old.status <> 'canceled' then
      perform public.log_activity(new.org_id, 'subscription_ended', null, format('Subscription ended: %s', v_plan));
    elsif new.cancel_at_period_end and not old.cancel_at_period_end then
      perform public.log_activity(new.org_id, 'subscription_canceling', null,
        format('Cancelled: %s. Stays active until %s, no further charges', v_plan, v_until));
    elsif old.cancel_at_period_end and not new.cancel_at_period_end then
      perform public.log_activity(new.org_id, 'subscription_resumed', null,
        format('Cancellation undone: %s keeps renewing monthly', v_plan));
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.activity_on_subscription() from public, anon, authenticated;

drop trigger if exists trg_activity_subscription on public.subscriptions;
create trigger trg_activity_subscription after insert or update on public.subscriptions
  for each row execute function public.activity_on_subscription();
