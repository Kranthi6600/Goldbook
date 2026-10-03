-- ============================================================================
-- Gold Loan SaaS — Loan lifecycle actions
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- Three SECURITY DEFINER functions for the loan detail page. Each checks
-- is_shop_member() on the loan's/customer's shop before mutating, then writes
-- an explicit audit_log row carrying the reason (the generic UPDATE trigger
-- also fires, but can't capture the reason).
-- ============================================================================

-- Close an open loan (active/overdue → closed). Not for full-payment closes —
-- recordPayment handles that path. This is a manual administrative close.
create or replace function close_loan(p_loan_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    raise exception 'Loan not found';
  end if;

  if not is_shop_member(v_loan.shop_id) then
    raise exception 'Not a member of this shop';
  end if;

  if v_loan.status not in ('active', 'overdue') then
    raise exception 'Loan is not open (status: %)', v_loan.status;
  end if;

  update loans
     set status = 'closed', closed_at = now()
   where id = p_loan_id;

  insert into audit_log (shop_id, actor_id, entity, entity_id, action, before, after)
  values (
    v_loan.shop_id,
    auth.uid(),
    'loan',
    p_loan_id,
    'close_loan',
    jsonb_build_object('status', v_loan.status),
    jsonb_build_object('status', 'closed', 'reason', p_reason)
  );
end;
$$;

-- Edit a loan's due date. Must remain after start_date.
create or replace function edit_loan_due_date(
  p_loan_id      uuid,
  p_new_due_date date,
  p_reason       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    raise exception 'Loan not found';
  end if;

  if not is_shop_member(v_loan.shop_id) then
    raise exception 'Not a member of this shop';
  end if;

  if v_loan.status not in ('active', 'overdue') then
    raise exception 'Loan is not open (status: %)', v_loan.status;
  end if;

  if p_new_due_date <= v_loan.start_date then
    raise exception 'New due date must be after the start date (%)', v_loan.start_date;
  end if;

  update loans
     set due_date = p_new_due_date
   where id = p_loan_id;

  insert into audit_log (shop_id, actor_id, entity, entity_id, action, before, after)
  values (
    v_loan.shop_id,
    auth.uid(),
    'loan',
    p_loan_id,
    'edit_due_date',
    jsonb_build_object('due_date', v_loan.due_date),
    jsonb_build_object('due_date', p_new_due_date, 'reason', p_reason)
  );
end;
$$;

-- Revoke all passbook tokens for a customer — every shared link dies.
create or replace function revoke_passbook(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
begin
  select shop_id into v_shop_id from customers where id = p_customer_id;
  if not found then
    raise exception 'Customer not found';
  end if;

  if not is_shop_member(v_shop_id) then
    raise exception 'Not a member of this shop';
  end if;

  update passbook_tokens
     set revoked = true
   where customer_id = p_customer_id
     and revoked = false;
end;
$$;
