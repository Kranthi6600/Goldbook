-- ============================================================================
-- Gold Loan SaaS — Financial integrity lockdown
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
-- Run AFTER 019_lock_financial_writes.sql.
-- (Requested as "018_financial_integrity"; numbered 020 because 018 is taken
--  by 018_lock_subscriptions.sql and 019 by the write-lockdown migration.)
--
-- Closes five money-manipulation paths:
--   1. Trigger freezes financial fields on loans after insert; deletes are
--      service-role only.
--   2. Interest stops accruing once a loan has closed_at (any terminal status).
--   3. All "today" business logic uses the IST calendar (ist_today()), not the
--      server's UTC date.
--   4. createLoan derives rate_monthly from the shop's slabs server-side and
--      verifies customer ownership (see lib/actions/loans.ts).
--   5. recordPayment rejects overpayments (> balance + Rs.1 tolerance)
--      server-side (see lib/actions/payments.ts).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ist_today(): business "today" on the Asia/Kolkata calendar.
-- ---------------------------------------------------------------------------
create or replace function ist_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

-- New loans default their start_date to the IST day, not UTC.
alter table loans alter column start_date set default ist_today();

-- ---------------------------------------------------------------------------
-- FIX 1 — Immutable financial fields on loans.
-- Allowed to change: status, due_date, closed_at, auction_notice_sent_at,
-- gold_photo_urls, gold_description, notes (plus bookkeeping cols).
-- Forbidden: every field that feeds the interest engine.
-- No role bypass — corrections go through a compensating action, not an UPDATE.
-- ---------------------------------------------------------------------------
create or replace function loans_immutable_financials()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.shop_id        is distinct from old.shop_id
     or new.customer_id   is distinct from old.customer_id
     or new.loan_number   is distinct from old.loan_number
     or new.loan_amount   is distinct from old.loan_amount
     or new.rate_monthly  is distinct from old.rate_monthly
     or new.start_date    is distinct from old.start_date
     or new.interest_mode is distinct from old.interest_mode
     or new.gold_weight_g is distinct from old.gold_weight_g
     or new.gold_purity   is distinct from old.gold_purity
  then
    raise exception 'financial fields are immutable; use admin override if a correction is required';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_loans_immutable_financials on loans;
create trigger trg_loans_immutable_financials
  before update on loans
  for each row execute function loans_immutable_financials();

-- Deletes are service-role only (members already have no DELETE policy;
-- this also blocks any accidental privileged delete path).
create or replace function loans_no_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'loans are financial records and cannot be deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_loans_no_delete on loans;
create trigger trg_loans_no_delete
  before delete on loans
  for each row execute function loans_no_delete();

-- ---------------------------------------------------------------------------
-- FIX 2 + FIX 3 — loan_summary: interest freezes at closed_at and "today" is
-- the IST calendar. When closed_at is set, the as-of date is the IST date of
-- closure — the loan never accrues another rupee.
-- ---------------------------------------------------------------------------
create or replace function loan_summary(p_loan_id uuid)
returns table (
  loan_amount      numeric,
  interest_accrued numeric,
  total_due        numeric,
  total_paid       numeric,
  balance          numeric,
  days_elapsed     integer,
  status           text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_as_of date;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    return;
  end if;

  v_as_of := case
               when v_loan.closed_at is not null
               then (v_loan.closed_at at time zone 'Asia/Kolkata')::date
               else ist_today()
             end;

  days_elapsed     := greatest(v_as_of - v_loan.start_date, 0);
  loan_amount      := v_loan.loan_amount;
  interest_accrued := calc_interest(
                        v_loan.loan_amount,
                        v_loan.rate_monthly,
                        v_loan.start_date,
                        v_as_of,
                        v_loan.interest_mode
                      );
  total_due        := loan_amount + interest_accrued;

  select coalesce(sum(amount), 0) into total_paid
    from payments
   where loan_id = p_loan_id;

  balance := total_due - total_paid;
  status  := v_loan.status;
  return next;
end;
$$;

-- Batched summary — same closed_at freeze + IST today, per row via LATERAL.
create or replace function loan_summaries(p_loan_ids uuid[])
returns table (
  loan_id          uuid,
  loan_amount      numeric,
  interest_accrued numeric,
  total_due        numeric,
  total_paid       numeric,
  balance          numeric,
  days_elapsed     integer,
  status           text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select l.id,
           l.loan_amount,
           calc_interest(l.loan_amount, l.rate_monthly, l.start_date,
                         a.as_of, l.interest_mode)                 as interest_accrued,
           l.loan_amount
             + calc_interest(l.loan_amount, l.rate_monthly, l.start_date,
                             a.as_of, l.interest_mode)             as total_due,
           coalesce(pmt.paid, 0)                                   as total_paid,
           l.loan_amount
             + calc_interest(l.loan_amount, l.rate_monthly, l.start_date,
                             a.as_of, l.interest_mode)
             - coalesce(pmt.paid, 0)                               as balance,
           greatest(a.as_of - l.start_date, 0)                     as days_elapsed,
           l.status                                                as status
      from loans l
      cross join lateral (
        select case
                 when l.closed_at is not null
                 then (l.closed_at at time zone 'Asia/Kolkata')::date
                 else ist_today()
               end as as_of
      ) a
      left join (
        select p.loan_id, sum(p.amount) as paid
          from payments p
         where p.loan_id = any(p_loan_ids)
         group by p.loan_id
      ) pmt on pmt.loan_id = l.id
     where l.id = any(p_loan_ids);
end;
$$;

-- dashboard_stats: IST today in the balance math and the due-soon window.
create or replace function dashboard_stats(p_shop_id uuid)
returns table (
  total_outstanding numeric,
  overdue_count     bigint,
  overdue_amount    numeric,
  today_collections numeric,
  gold_in_custody_g numeric,
  pending_reminders bigint,
  loan_count        bigint
)
language sql
stable
set search_path = public
as $$
  with open_loans as (
    select l.*, coalesce(p.paid, 0) as paid
      from loans l
      left join (
        select loan_id, sum(amount) as paid
          from payments
         where shop_id = p_shop_id
         group by loan_id
      ) p on p.loan_id = l.id
     where l.shop_id = p_shop_id
       and l.status in ('active', 'overdue')
  ),
  balances as (
    select o.*,
           o.loan_amount
             + calc_interest(o.loan_amount, o.rate_monthly, o.start_date,
                             ist_today(), o.interest_mode)
             - o.paid as balance
      from open_loans o
  )
  select
    coalesce(sum(b.balance), 0),
    count(*) filter (where b.status = 'overdue'),
    coalesce(sum(b.balance) filter (where b.status = 'overdue'), 0),
    (select coalesce(sum(amount), 0)
       from payments
      where shop_id = p_shop_id
        and (paid_at at time zone 'Asia/Kolkata')::date = ist_today()),
    coalesce(sum(b.gold_weight_g), 0),
    (select count(*)
       from loans l2
      where l2.shop_id = p_shop_id
        and l2.status in ('active', 'overdue')
        and l2.due_date <= ist_today() + 3
        and not exists (
          select 1 from reminders r
           where r.loan_id = l2.id
             and r.sent_at > now() - interval '3 days'
        )),
    (select count(*) from loans l3 where l3.shop_id = p_shop_id)
  from balances b;
$$;

-- customer_loan_stats: IST today in the outstanding math.
create or replace function customer_loan_stats(p_shop_id uuid)
returns table (
  customer_id       uuid,
  active_loan_count bigint,
  outstanding       numeric
)
language sql
stable
set search_path = public
as $$
  select l.customer_id,
         count(*) as active_loan_count,
         sum(
           l.loan_amount
           + calc_interest(l.loan_amount, l.rate_monthly, l.start_date,
                           ist_today(), l.interest_mode)
           - coalesce(p.paid, 0)
         ) as outstanding
    from loans l
    left join (
      select loan_id, sum(amount) as paid
        from payments
       where shop_id = p_shop_id
       group by loan_id
    ) p on p.loan_id = l.id
   where l.shop_id = p_shop_id
     and l.status in ('active', 'overdue')
   group by l.customer_id;
$$;

-- Monthly statements: clamp the as-of date to IST today (same semantics as
-- before, just on the shopkeeper's calendar).
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
  v_as_of   date := least(p_to, ist_today());
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
  v_as_of date := least(p_to, ist_today());
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

-- ---------------------------------------------------------------------------
-- Overdue cron: same IST day as everything else. Runs 00:05 IST (18:35 UTC).
-- ---------------------------------------------------------------------------
do $$
begin
  perform cron.unschedule('mark-overdue');
exception when others then
  null; -- job may not exist on a fresh DB
end $$;

select cron.schedule(
  'mark-overdue',
  '35 18 * * *',
  $$update loans
       set status = 'overdue'
     where due_date < ist_today()
       and status = 'active'$$
);
