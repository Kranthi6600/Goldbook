"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { OnboardingSchema, ShopSchema } from "@/lib/schemas/shop"
import { DEFAULT_TEMPLATES } from "@/lib/utils/template"

const TRIAL_DAYS = 14

export async function createShop(
  input: unknown
): Promise<{ error?: string; shopId?: string }> {
  const parsed = OnboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { name, phone, address, interest_mode, upi_id, slabs } = parsed.data
  const trialEndsAt = new Date(
    Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .insert({
      owner_id: user.id,
      name,
      phone,
      address: address || null,
      upi_id: upi_id || null,
      interest_mode,
      plan: "trial",
      trial_ends_at: trialEndsAt,
      whatsapp_templates: DEFAULT_TEMPLATES,
    })
    .select("id")
    .single()

  if (shopError || !shop) {
    return { error: shopError?.message ?? "Failed to create shop." }
  }

  const shopId = (shop as { id: string }).id

  const { error: slabError } = await supabase.from("slabs").insert(
    slabs.map((s) => ({
      shop_id: shopId,
      min_amount: s.min_amount,
      max_amount: s.max_amount,
      rate_monthly: s.rate_monthly,
    }))
  )

  if (slabError) {
    // Roll back the shop row so the owner isn't left without slabs.
    await supabase.from("shops").delete().eq("id", shopId)
    return { error: `Failed to save slabs: ${slabError.message}` }
  }

  return { shopId }
}

export async function updateShop(
  shopId: string,
  input: unknown
): Promise<{ error?: string }> {
  const idParsed = z.uuid().safeParse(shopId)
  if (!idParsed.success) {
    return { error: "Invalid shop id." }
  }

  const parsed = ShopSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { name, phone, interest_mode, upi_id } = parsed.data

  const { data, error } = await supabase
    .from("shops")
    .update({
      name,
      phone,
      upi_id: upi_id || null,
      interest_mode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId)
    .eq("owner_id", user.id) // owner-only (RLS also enforces this)
    .select("id")

  if (error) {
    return { error: error.message }
  }
  if (!data || (data as unknown[]).length === 0) {
    return { error: "Shop not found or you are not the owner." }
  }

  return {}
}
