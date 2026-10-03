-- ============================================================================
-- Gold Loan SaaS — Monthly statement RPCs (PDF backend)
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- Both functions are SECURITY DEFINER + is_shop_member guarded.
--
-- Period semantics:
--   * Loans in scope: started on/before p_to, and not closed before p_from
--     (closed_at NULL or closed_at::date >= p_from).
--   * interest_accrued / total_due / total_paid / balance are computed
--     AS OF min(p_to, current_date) — same math as loan_summary, just at the
--     period end. When p_to = today they match loan_summary exactly.
-- ============================================================================

create or replace function customer_monthly_statement(
  p_customer_id uuid,
  p_from        date,
  p_to          date
)
returns table (
  loan_id          uuid,
  loan_number      text,
  loan_amount      numeric,
  interest_accrued numeric,
  total_due        numeric,
  total_paid       numeric,
  balance          numeric,
  status           text,
  start_date       date,
  due_date         date
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_as_of   date := least(p_to, current_date);
begin
  if p_from > p_to then
    raise exception 'Invalid date range: from must be on or before to';
  end if;

  select shop_id into v_shop_id from customers where id = p_customer_id;
  if not found then
    raise exception 'Customer not found';
  end if;

  if not is_shop_member(v_shop_id) then
    raise exception 'Not a member of this shop';
  end if;

  return query
  with period_loans as (
    select l.*
      from loans l
     where l.customer_id = p_customer_id
       and l.shop_id = v_shop_id
       and l.start_date <= p_to
       and (l.closed_at is null or l.closed_at::date >= p_from)
  ),
  accrued as (
    select pl.*,
           calc_interest(
             pl.loan_amount, pl.rate_monthly, pl.start_date, v_as_of,
             pl.interest_mode
           ) as interest
      from period_loans pl
  ),
  paid as (
    select p.loan_id, sum(p.amount) as amount
      from payments p
      join period_loans pl on pl.id = p.loan_id
     group by p.loan_id
  )
  select
    a.id,
    a.loan_number,
    a.loan_amount,
    a.interest,
    a.loan_amount + a.interest,
    coalesce(pd.amount, 0),
    a.loan_amount + a.interest - coalesce(pd.amount, 0),
    a.status,
    a.start_date,
    a.due_date
  from accrued a
  left join paid pd on pd.loan_id = a.id
  order by a.start_date, a.loan_number;
end;
$$;

-- All customers' loans in the period, sorted by due date (due_date is a
-- loans column — used for ordering, intentionally not in RETURNS TABLE).
create or replace function shop_monthly_statement(
  p_shop_id uuid,
  p_from    date,
  p_to      date
)
returns table (
  loan_number      text,
  customer_name    text,
  gold_weight_g    numeric,
  loan_amount      numeric,
  interest_accrued numeric,
  total_due        numeric,
  total_paid       numeric,
  balance          numeric,
  status           text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_as_of date := least(p_to, current_date);
begin
  if p_from > p_to then
    raise exception 'Invalid date range: from must be on or before to';
  end if;

  if not is_shop_member(p_shop_id) then
    raise exception 'Not a member of this shop';
  end if;

  return query
  with period_loans as (
    select l.*
      from loans l
     where l.shop_id = p_shop_id
       and l.start_date <= p_to
       and (l.closed_at is null or l.closed_at::date >= p_from)
  ),
  accrued as (
    select pl.*,
           calc_interest(
             pl.loan_amount, pl.rate_monthly, pl.start_date, v_as_of,
             pl.interest_mode
           ) as interest
      from period_loans pl
  ),
  paid as (
    select p.loan_id, sum(p.amount) as amount
      from payments p
      join period_loans pl on pl.id = p.loan_id
     group by p.loan_id
  )
  select
    a.loan_number,
    c.name,
    a.gold_weight_g,
    a.loan_amount,
    a.interest,
    a.loan_amount + a.interest,
    coalesce(pd.amount, 0),
    a.loan_amount + a.interest - coalesce(pd.amount, 0),
    a.status
  from accrued a
  join customers c on c.id = a.customer_id
  left join paid pd on pd.loan_id = a.id
  order by a.due_date, a.loan_number;
end;
$$;
