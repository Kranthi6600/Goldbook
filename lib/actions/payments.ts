"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getCurrentShopContext } from "@/lib/supabase/server"
import { PaymentSchema } from "@/lib/schemas/payment"

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

  const { shopId, error: shopError } = await getCurrentShopContext()
  if (!shopId) {
    return { error: shopError }
  }

  const supabase = await createClient()
  const { amount, method, kind, reference, paid_at, notes } = parsed.data

  // Use atomic RPC function for transaction safety
  const { data: result, error: rpcError } = await supabase.rpc(
    "record_payment_atomic",
    {
      p_loan_id: loanId,
      p_shop_id: shopId,
      p_amount: amount,
      p_method: method,
      p_kind: kind,
      p_reference: reference || null,
      p_paid_at: new Date(paid_at).toISOString(),
      p_notes: notes || null,
    }
  )

  if (rpcError) {
    return { error: rpcError.message }
  }

  const rpcResult = result as {
    error?: string
    payment?: { id: string; amount: number; method: string; paid_at: string }
    newBalance?: number
    loanClosed?: boolean
  }

  if (rpcResult.error) {
    return { error: rpcResult.error }
  }

  revalidatePath(`/loans/${loanId}`)
  revalidatePath("/loans")
  revalidatePath("/")

  return {
    payment: rpcResult.payment,
    newBalance: rpcResult.newBalance,
    loanClosed: rpcResult.loanClosed,
  }
}
