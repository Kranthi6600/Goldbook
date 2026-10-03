import { createClient } from "@/lib/supabase/server"

/**
 * SQL is the ONLY source of truth for loan interest/balance numbers.
 * loan_summary(p_loan_id) computes them in Postgres — never recompute in JS.
 */

export type LoanSummary = {
  loan_amount: number
  interest_accrued: number
  total_due: number
  total_paid: number
  balance: number
  days_elapsed: number
  status: string
}

type LoanSummaryRpcRow = {
  loan_amount: number | string
  interest_accrued: number | string
  total_due: number | string
  total_paid: number | string
  balance: number | string
  days_elapsed: number | string
  status: string
}

/** Postgres numeric fields can arrive as strings — coerce everything. */
export function toLoanSummary(row: LoanSummaryRpcRow): LoanSummary {
  return {
    loan_amount: Number(row.loan_amount),
    interest_accrued: Number(row.interest_accrued),
    total_due: Number(row.total_due),
    total_paid: Number(row.total_paid),
    balance: Number(row.balance),
    days_elapsed: Number(row.days_elapsed),
    status: row.status,
  }
}

/** Server-side only. Throws if the loan has no summary row. */
export async function getLoanSummary(loanId: string): Promise<LoanSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("loan_summary", {
    p_loan_id: loanId,
  })

  if (error) {
    throw new Error(`Failed to load loan summary: ${error.message}`)
  }

  const row = ((data ?? []) as LoanSummaryRpcRow[])[0]
  if (!row) {
    throw new Error(`No summary returned for loan ${loanId}`)
  }

  return toLoanSummary(row)
}
