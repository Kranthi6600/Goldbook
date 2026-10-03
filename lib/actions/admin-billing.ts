"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const MarkPaidSchema = z.object({
  plan: z.enum(["base", "base_messages", "base_messages_comm"]),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["upi", "cash", "bank"]),
  reference: z.string().trim().max(100).optional(),
  period_months: z.number().int().min(1).max(12),
})

/**
 * Cookie-session admin gate — is_admin() reads auth.uid() server-side,
 * so this MUST use the user-session client, not the service role.
 */
async function requireAdminSession() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("is_admin")
  if (error || data !== true) {
    return null
  }
  return supabase
}

export async function markShopPaid(
  shopId: string,
  input: unknown
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(shopId).success) {
    return { error: "Invalid shop id." }
  }

  const parsed = MarkPaidSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const supabase = await requireAdminSession()
  if (!supabase) {
    return { error: "not authorized" }
  }

  const { error } = await supabase.rpc("activate_subscription", {
    p_shop_id: shopId,
    p_plan: parsed.data.plan,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference || null,
    p_period_months: parsed.data.period_months,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/shops/${shopId}`)
  revalidatePath("/admin/shops")
  revalidatePath("/admin")

  return {}
}
