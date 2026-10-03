-- ============================================================================
-- Gold Loan SaaS — Batched loan summaries
-- ============================================================================
-- HOW TO RUN: manually in Supabase SQL Editor (same as previous migrations).
--
-- loan_summaries(p_loan_ids uuid[]) returns one summary row per loan in a
-- single call — replaces N+1 loan_summary RPCs on the loans list, reminder
-- queue, and passbook pages.
--
-- SECURITY DEFINER — same model as loan_summary (members via app client,
-- passbook via service-role client). Column references are fully qualified so
-- out-params (loan_id, loan_amount, ...) never shadow table columns.
-- ============================================================================

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
                         current_date, l.interest_mode)            as interest_accrued,
           l.loan_amount
             + calc_interest(l.loan_amount, l.rate_monthly, l.start_date,
                             current_date, l.interest_mode)        as total_due,
           coalesce(pmt.paid, 0)                                   as total_paid,
           l.loan_amount
             + calc_interest(l.loan_amount, l.rate_monthly, l.start_date,
                             current_date, l.interest_mode)
             - coalesce(pmt.paid, 0)                               as balance,
           greatest(current_date - l.start_date, 0)                as days_elapsed,
           l.status                                                as status
      from loans l
      left join (
        select p.loan_id, sum(p.amount) as paid
          from payments p
         where p.loan_id = any(p_loan_ids)
         group by p.loan_id
      ) pmt on pmt.loan_id = l.id
     where l.id = any(p_loan_ids);
end;
$$;
