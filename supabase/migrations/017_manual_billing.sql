-- ============================================================================
-- Gold Loan SaaS — Manual billing (Prompt 23)
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- 1. admins table + is_admin() — allowlist for billing actions.
-- 2. subscriptions becomes a ledger: drop the per-shop unique, add
--    amount/method/reference + period columns, widen plan check.
-- 3. shops.plan check widened for 'active'/'suspended'.
-- 4. activate_subscription() — admin-only RPC that records a paid period
--    and flips shops.plan / trial_ends_at.
-- ============================================================================

-- Admin allowlist table (SQL can't read env vars, so seed manually)
create table if not exists admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz default now()
);
alter table admins enable row level security;
-- No policies: service role only. is_admin() is security definer and reads it.

-- is_admin helper
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- subscriptions is a ledger now — one row per paid period, not one per shop.
alter table subscriptions
  drop constraint if exists subscriptions_shop_id_key;

alter table subscriptions add column if not exists amount numeric;
alter table subscriptions add column if not exists method text;
alter table subscriptions add column if not exists reference text;
alter table subscriptions add column if not exists current_period_start date;
alter table subscriptions add column if not exists current_period_end date;

-- Widen plan checks to the real tiers (keep old values so existing rows stay valid).
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check
  check (plan in ('trial','starter','pro','base','base_messages','base_messages_comm'));

alter table subscriptions drop constraint if exists subscriptions_method_check;
alter table subscriptions add constraint subscriptions_method_check
  check (method is null or method in ('upi','cash','bank'));

alter table shops drop constraint if exists shops_plan_check;
alter table shops add constraint shops_plan_check
  check (plan in ('trial','active','suspended','starter','pro'));

-- activate_subscription: admin-only. Records the paid period, flips the shop.
create or replace function activate_subscription(
  p_shop_id uuid,
  p_plan text,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_period_months int default 1
) returns void
language plpgsql security definer as $$
declare
  v_start date := current_date;
  v_end date := (current_date + (p_period_months || ' months')::interval)::date;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  if p_plan not in ('base','base_messages','base_messages_comm') then
    raise exception 'invalid plan';
  end if;
  if p_method not in ('upi','cash','bank') then
    raise exception 'invalid method';
  end if;

  insert into subscriptions
    (shop_id, plan, amount, method, reference, status,
     current_period_start, current_period_end)
  values
    (p_shop_id, p_plan, p_amount, p_method, p_reference, 'active', v_start, v_end);

  update shops
    set plan = 'active',
        trial_ends_at = greatest(coalesce(trial_ends_at, now()), v_end::timestamptz)
    where id = p_shop_id;
end;
$$;

-- ============================================================================
-- AFTER RUNNING: seed yourself as admin (replace email):
--   insert into admins (user_id)
--     select id from auth.users where email = 'your@email.com';
-- ============================================================================
