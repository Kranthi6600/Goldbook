-- ============================================================================
-- Optimize RLS policies to avoid repeated auth.uid() calls
-- ============================================================================

-- Create a stable function to cache auth.uid() result
-- This prevents Postgres from evaluating auth.uid() for every row
create or replace function current_uid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- Drop and recreate shops_owner_all policy to use current_uid()
drop policy if exists shops_owner_all on shops;

create policy shops_owner_all on shops
  for all using (owner_id = current_uid())
  with check (owner_id = current_uid());

-- Update is_shop_member to use current_uid() for consistency
create or replace function is_shop_member(p_shop_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := current_uid();
begin
  return exists (
    select 1 from shops
     where id = p_shop_id
       and owner_id = v_uid
  ) or exists (
    select 1 from shop_staff
     where shop_id = p_shop_id
       and user_id = v_uid
  );
end;
$$;
