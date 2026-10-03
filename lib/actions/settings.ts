"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  ShopSettingsSchema,
  SlabsSchema,
  WhatsappTemplatesSchema,
} from "@/lib/schemas/shop"

async function requireOwnedShop(shopId: string) {
  if (!z.uuid().safeParse(shopId).success) {
    return { error: "Invalid shop id." as const }
  }

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
    .eq("id", shopId)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!shop) {
    return { error: "Shop not found or you are not the owner." }
  }

  return { supabase }
}

export async function updateShopSettings(
  shopId: string,
  input: unknown
): Promise<{ error?: string }> {
  const parsed = ShopSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const result = await requireOwnedShop(shopId)
  if ("error" in result) {
    return { error: result.error }
  }

  const { name, phone, address, upi_id, interest_mode, grace_days } =
    parsed.data

  // RLS also restricts shops to owner_id; the explicit check gives a clean error.
  const { data, error } = await result.supabase
    .from("shops")
    .update({
      name,
      phone,
      address: address || null,
      upi_id: upi_id || null,
      interest_mode,
      grace_days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId)
    .select("id")

  if (error) {
    return { error: error.message }
  }
  if (!data || (data as unknown[]).length === 0) {
    return { error: "Update failed." }
  }

  revalidatePath("/settings/general")
  revalidatePath("/", "layout")
  return {}
}

export async function replaceSlabs(
  shopId: string,
  slabs: unknown
): Promise<{ error?: string }> {
  const parsed = SlabsSchema.safeParse(slabs)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid slabs." }
  }

  const result = await requireOwnedShop(shopId)
  if ("error" in result) {
    return { error: result.error }
  }

  // Atomic delete + insert via RPC (requires migration 004).
  const { error } = await result.supabase.rpc("replace_slabs", {
    p_shop_id: shopId,
    p_slabs: parsed.data,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings/slabs")
  return {}
}

export async function updateWhatsappTemplates(
  shopId: string,
  templates: unknown
): Promise<{ error?: string }> {
  const parsed = WhatsappTemplatesSchema.safeParse(templates)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const key = issue?.path[0] ? `${String(issue.path[0])}: ` : ""
    return { error: `${key}${issue?.message ?? "Invalid templates."}` }
  }

  const result = await requireOwnedShop(shopId)
  if ("error" in result) {
    return { error: result.error }
  }

  const { error } = await result.supabase
    .from("shops")
    .update({
      whatsapp_templates: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings/whatsapp")
  return {}
}
