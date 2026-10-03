-- ============================================================================
-- Gold Loan SaaS — Shop settings columns + atomic slab replacement
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- 1. Adds shops.address and shops.grace_days (collected in onboarding/settings,
--    previously had no column to persist to).
-- 2. replace_slabs(p_shop_id, p_slabs) — deletes and re-inserts a shop's slabs
--    atomically inside one function call (single transaction).
--    SECURITY INVOKER — RLS applies; only shop members can run it.
-- ============================================================================

alter table shops add column if not exists address text;
alter table shops add column if not exists grace_days integer not null default 0;

create or replace function replace_slabs(
  p_shop_id uuid,
  p_slabs   jsonb
) returns void
language plpgsql
set search_path = public
as $$
begin
  delete from slabs where shop_id = p_shop_id;

  insert into slabs (shop_id, min_amount, max_amount, rate_monthly)
  select p_shop_id,
         (s ->> 'min_amount')::numeric,
         (s ->> 'max_amount')::numeric,
         (s ->> 'rate_monthly')::numeric
    from jsonb_array_elements(p_slabs) as s;
end;
$$;
