"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

/**
 * Staff management — owner-only enforcement lives in the SECURITY DEFINER
 * RPCs (invite_staff / remove_staff). The actions just validate + relay.
 */

export async function inviteStaff(
  shopId: string,
  email: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(shopId).success) {
    return { error: "Invalid shop id." }
  }
  const parsed = z.email("Enter a valid email address.").safeParse(email)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("invite_staff", {
    p_shop_id: shopId,
    p_email: parsed.data.trim().toLowerCase(),
  })
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings/staff")
  return {}
}

export async function removeStaff(
  staffId: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("remove_staff", {
    p_staff_id: staffId,
  })
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings/staff")
  return {}
}
