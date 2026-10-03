-- ============================================================================
-- Gold Loan SaaS — Dashboard aggregate function
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as 001_initial_schema.sql).
--
-- dashboard_stats(p_shop_id) returns all dashboard metrics in ONE call:
--   total_outstanding  — sum of (principal + accrued interest - paid) on
--                        active/overdue loans
--   overdue_count      — count of overdue loans
--   overdue_amount     — sum of outstanding balance on overdue loans
--   today_collections  — payments received today (Asia/Kolkata day)
--   gold_in_custody_g  — total gold weight held on active/overdue loans
--   pending_reminders  — loans overdue or due within 3 days with no reminder
--                        sent in the last 3 days
--   loan_count         — total loans ever (used for empty-state checks)
--
-- Runs SECURITY INVOKER (default) so RLS still applies to the caller.
-- ============================================================================

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
                             current_date, o.interest_mode)
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
        and (paid_at at time zone 'Asia/Kolkata')::date
            = (now() at time zone 'Asia/Kolkata')::date),
    coalesce(sum(b.gold_weight_g), 0),
    (select count(*)
       from loans l2
      where l2.shop_id = p_shop_id
        and l2.status in ('active', 'overdue')
        and l2.due_date <= current_date + 3
        and not exists (
          select 1 from reminders r
           where r.loan_id = l2.id
             and r.sent_at > now() - interval '3 days'
        )),
    (select count(*) from loans l3 where l3.shop_id = p_shop_id)
  from balances b;
$$;
