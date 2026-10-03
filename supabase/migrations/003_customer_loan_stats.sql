-- ============================================================================
-- Gold Loan SaaS — Customer loan aggregates
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- customer_loan_stats(p_shop_id) returns, per customer:
--   active_loan_count — loans with status active/overdue
--   outstanding       — sum of (principal + accrued interest - paid)
-- Used by the customers list. SECURITY INVOKER — RLS applies to the caller.
-- ============================================================================

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
                           current_date, l.interest_mode)
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
