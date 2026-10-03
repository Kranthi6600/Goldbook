"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const VALID_KINDS = new Set(["7d", "3d", "1d", "overdue"])

async function getShopAndUser() {
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

  return { supabase, shopId: (shop as { id: string }).id, userId: user.id }
}

export async function logReminder(
  loanId: string,
  kind: string,
  messageBody: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(loanId).success) {
    return { error: "Invalid loan id." }
  }
  if (!VALID_KINDS.has(kind)) {
    return { error: "Invalid reminder kind." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }

  const { error } = await result.supabase.from("reminders").insert({
    loan_id: loanId,
    shop_id: result.shopId,
    kind,
    channel: "whatsapp",
    sent_by: result.userId,
    message_body: messageBody || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/reminders")
  revalidatePath("/")
  return {}
}

/** Bulk-mark a whole section as sent (e.g. "all 7d reminders done"). */
export async function markAllReminders(
  loanIds: string[],
  kind: string
): Promise<{ error?: string; count?: number }> {
  const ids = z.array(z.uuid()).min(1).safeParse(loanIds)
  if (!ids.success) {
    return { error: "Invalid loan list." }
  }
  if (!VALID_KINDS.has(kind)) {
    return { error: "Invalid reminder kind." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }

  const { error } = await result.supabase.from("reminders").insert(
    ids.data.map((loanId) => ({
      loan_id: loanId,
      shop_id: result.shopId,
      kind,
      channel: "whatsapp",
      sent_by: result.userId,
    }))
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/reminders")
  revalidatePath("/")
  return { count: ids.data.length }
}
