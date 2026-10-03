import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  toLoanSummary,
  type LoanSummary,
} from "@/lib/queries/loan-summary"

/**
 * Batched version of loan_summary — one RPC call for many loans.
 * Requires migration 011_loan_summaries_batch.sql (loan_summaries RPC).
 * Server-side only. Pass an existing client (e.g. the passbook admin client)
 * to reuse it; otherwise the per-request server client is used.
 */
export async function getLoanSummaries(
  loanIds: string[],
  client?: SupabaseClient
): Promise<Map<string, LoanSummary>> {
  const map = new Map<string, LoanSummary>()
  if (loanIds.length === 0) {
    return map
  }

  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.rpc("loan_summaries", {
    p_loan_ids: loanIds,
  })

  if (error) {
    throw new Error(`Failed to load loan summaries: ${error.message}`)
  }

  type BatchRow = Parameters<typeof toLoanSummary>[0] & {
    loan_id: string
  }
  for (const row of (data ?? []) as BatchRow[]) {
    map.set(row.loan_id, toLoanSummary(row))
  }
  return map
}
