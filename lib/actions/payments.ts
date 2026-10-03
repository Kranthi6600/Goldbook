"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { PaymentSchema } from "@/lib/schemas/payment"
import type { LoanSummaryRow } from "@/lib/queries/loans"

async function getShopId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." as const }
  }

  const { data: shop, error } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!shop) {
    return { error: "Shop not found. Complete onboarding first." }
  }

  return { supabase, shopId: (shop as { id: string }).id }
}

export async function recordPayment(
  loanId: string,
  input: unknown
): Promise<{
  error?: string
  payment?: { id: string; amount: number; method: string; paid_at: string }
  newBalance?: number
  loanClosed?: boolean
}> {
  if (!z.uuid().safeParse(loanId).success) {
    return { error: "Invalid loan id." }
  }

  const parsed = PaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const result = await getShopId()
  if ("error" in result) {
    return { error: result.error }
  }
  const { supabase, shopId } = result

  // Verify the loan exists and is payable (RLS also scopes it to this shop).
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, status")
    .eq("id", loanId)
    .eq("shop_id", shopId)
    .maybeSingle()

  if (loanError) {
    return { error: loanError.message }
  }
  if (!loan) {
    return { error: "Loan not found." }
  }
  if (loan.status !== "active" && loan.status !== "overdue") {
    return { error: "This loan is already closed." }
  }

  // Server-side balance check via the same RPC the UI shows.
  const { data: summaryRows, error: summaryError } = await supabase.rpc(
    "loan_summary",
    { p_loan_id: loanId }
  )
  if (summaryError) {
    return { error: summaryError.message }
  }

  const summary = ((summaryRows ?? []) as LoanSummaryRow[])[0]
  const balance = summary ? Number(summary.balance) : 0

  const { amount, method, kind, reference, paid_at, notes } = parsed.data

  // Overpayment guard: allow ₹1 rounding tolerance only.
  if (amount > balance + 1) {
    return {
      error: `Payment exceeds balance (outstanding ₹${balance.toFixed(2)}).`,
    }
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      loan_id: loanId,
      shop_id: shopId,
      amount,
      method,
      kind,
      reference: reference || null,
      paid_at: new Date(paid_at).toISOString(),
      notes: notes || null,
    })
    .select("id, amount, method, paid_at")
    .single()

  if (paymentError || !payment) {
    return { error: paymentError?.message ?? "Failed to record payment." }
  }

  const newBalance = Math.max(0, balance - amount)
  let loanClosed = false

  if (newBalance <= 0.01) {
    const { error: closeError } = await supabase
      .from("loans")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", loanId)

    if (closeError) {
      return {
        payment: payment as {
          id: string
          amount: number
          method: string
          paid_at: string
        },
        newBalance,
        error: `Payment recorded, but closing the loan failed: ${closeError.message}`,
      }
    }
    loanClosed = true
  }

  revalidatePath(`/loans/${loanId}`)
  revalidatePath("/loans")
  revalidatePath("/")

  return {
    payment: payment as {
      id: string
      amount: number
      method: string
      paid_at: string
    },
    newBalance,
    loanClosed,
  }
}
