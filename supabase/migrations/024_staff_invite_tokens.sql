-- Add invite_token column to shop_staff for email invitations

alter table shop_staff
  add column if not exists invite_token text;

-- Update invite_staff function to accept invite_token
create or replace function invite_staff(
  p_shop_id uuid, 
  p_email text, 
  p_invite_token text
)
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

  insert into shop_staff (shop_id, user_id, role, invited_email, invite_token)
  values (p_shop_id, null, 'staff', v_email, p_invite_token);
end;
$$;

-- Create function to accept staff invite
create or replace function accept_staff_invite(p_invite_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff shop_staff%rowtype;
  v_user_id uuid;
begin
  -- Get the current user
  select id into v_user_id from auth.users where id = auth.uid();
  
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;
  
  -- Find the invite
  select * into v_staff from shop_staff 
  where invite_token = p_invite_token and accepted_at is null;
  
  if not found then
    raise exception 'Invalid or expired invite';
  end if;
  
  -- Check if email matches
  if lower(v_staff.invited_email) != lower((select email from auth.users where id = v_user_id)) then
    raise exception 'Email does not match invite';
  end if;
  
  -- Accept the invite
  update shop_staff 
  set user_id = v_user_id, accepted_at = now()
  where id = v_staff.id;
end;
$$;
