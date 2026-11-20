"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { randomUUID } from "node:crypto"

import { createClient } from "@/lib/supabase/server"
import { sendStaffInviteEmail } from "@/lib/email/staff-invite"

/**
 * Staff management — owner-only enforcement lives in the SECURITY DEFINER
 * RPCs (invite_staff / remove_staff). The actions just validate + relay.
 */

export async function inviteStaff(
  shopId: string,
  email: string
): Promise<{ error?: string; inviteToken?: string }> {
  if (!z.uuid().safeParse(shopId).success) {
    return { error: "Invalid shop id." }
  }
  const parsed = z.email("Enter a valid email address.").safeParse(email)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." }
  }

  const supabase = await createClient()
  
  // Get shop name for email
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("name")
    .eq("id", shopId)
    .single()

  if (shopError || !shop) {
    return { error: "Shop not found." }
  }

  // Generate invite token
  const inviteToken = randomUUID()

  // Store invite in database
  const { error } = await supabase.rpc("invite_staff", {
    p_shop_id: shopId,
    p_email: parsed.data.trim().toLowerCase(),
    p_invite_token: inviteToken,
  })
  
  if (error) {
    return { error: error.message }
  }

  // Send email
  try {
    await sendStaffInviteEmail({
      to: parsed.data.trim().toLowerCase(),
      shopName: (shop as { name: string }).name,
      inviteToken,
    })
  } catch (emailError) {
    console.error("Failed to send invite email:", emailError)
    return { error: "Invite created but email failed to send." }
  }

  revalidatePath("/settings/staff")
  return { inviteToken }
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

export async function resendInvite(
  staffId: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id." }
  }

  const supabase = await createClient()
  
  // Get staff invite details
  const { data: staff, error: staffError } = await supabase
    .from("shop_staff")
    .select("invited_email, invite_token, shops(name)")
    .eq("id", staffId)
    .single()

  if (staffError || !staff) {
    return { error: "Staff invite not found." }
  }

  const staffData = staff as {
    invited_email: string
    invite_token: string
    shops: { name: string }
  }

  // Send email again
  try {
    await sendStaffInviteEmail({
      to: staffData.invited_email,
      shopName: staffData.shops.name,
      inviteToken: staffData.invite_token,
    })
  } catch (emailError) {
    console.error("Failed to resend invite email:", emailError)
    return { error: "Failed to resend invitation email." }
  }

  revalidatePath("/settings/staff")
  return {}
}
