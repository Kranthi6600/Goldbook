-- ============================================================================
-- Gold Loan SaaS — Staff invites (DB-only MVP)
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- shop_staff.user_id becomes nullable so an invite can exist before the
-- invited person signs up. invite_staff writes invited_email + NULL user_id;
-- accepted_at marks activation when user_id is later linked (manual/SQL for
-- MVP — no email flow yet).
-- ============================================================================

alter table shop_staff
  add column if not exists invited_email text,
  add column if not exists accepted_at   timestamptz;

alter table shop_staff
  alter column user_id drop not null;

-- Owner-only: invite by email. Idempotent on email (no duplicate pending rows).
create or replace function invite_staff(p_shop_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not exists (
    select 1 from shops where id = p_shop_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the shop owner can invite staff';
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Invalid email';
  end if;

  -- Owner's own email doesn't need an invite.
  if exists (
    select 1 from auth.users u
    join shops s on s.owner_id = u.id
    where s.id = p_shop_id and lower(u.email) = v_email
  ) then
    raise exception 'That email belongs to the shop owner';
  end if;

  if exists (
    select 1 from shop_staff
    where shop_id = p_shop_id and lower(invited_email) = v_email
  ) then
    raise exception 'This email is already invited';
  end if;

  insert into shop_staff (shop_id, user_id, role, invited_email)
  values (p_shop_id, null, 'staff', v_email);
end;
$$;

-- Owner-only: remove a staff row. Refuses to remove the shop owner.
create or replace function remove_staff(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff shop_staff%rowtype;
  v_owner uuid;
begin
  select * into v_staff from shop_staff where id = p_staff_id;
  if not found then
    raise exception 'Staff member not found';
  end if;

  select owner_id into v_owner from shops where id = v_staff.shop_id;

  if v_owner is distinct from auth.uid() then
    raise exception 'Only the shop owner can remove staff';
  end if;

  -- Safety: never delete the owner's own staff row.
  if v_staff.user_id is not null and v_staff.user_id = v_owner then
    raise exception 'Cannot remove the shop owner';
  end if;

  delete from shop_staff where id = p_staff_id;
end;
$$;
