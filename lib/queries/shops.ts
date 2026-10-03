import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export type ShopSummary = {
  id: string
  name: string
  interest_mode: "simple" | "compound"
  plan: string
  /** How the current user belongs to this shop — "staff" ⇒ hide owner-only UI. */
  role: "owner" | "staff"
}

/**
 * Returns the current user's shop: owned (owner_id match) or staffed
 * (accepted shop_staff row). Server-side only. Wrapped in React cache() so
 * layout + page share one call per request.
 */
export const getCurrentShop = cache(
  async (): Promise<ShopSummary | null> => {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    const { data: owned, error: ownError } = await supabase
      .from("shops")
      .select("id, name, interest_mode, plan")
      .eq("owner_id", user.id)
      .maybeSingle()

    if (ownError) {
      throw new Error(`Failed to load shop: ${ownError.message}`)
    }
    if (owned) {
      return { ...(owned as Omit<ShopSummary, "role">), role: "owner" }
    }

    // Staff path — pending invites have user_id NULL, so they can't match.
    const { data: membership, error: staffError } = await supabase
      .from("shop_staff")
      .select("shop_id, shops(id, name, interest_mode, plan)")
      .eq("user_id", user.id)
      .maybeSingle()

    if (staffError) {
      throw new Error(`Failed to load shop membership: ${staffError.message}`)
    }

    const joined = membership as {
      shops:
        | { id: string; name: string; interest_mode: "simple" | "compound"; plan: string }
        | { id: string; name: string; interest_mode: "simple" | "compound"; plan: string }[]
        | null
    } | null
    const shop = Array.isArray(joined?.shops) ? joined?.shops[0] : joined?.shops
    if (!shop) {
      return null
    }
    return { ...shop, role: "staff" }
  }
)

export type ShopSettings = {
  id: string
  name: string
  phone: string
  address: string | null
  upi_id: string | null
  interest_mode: "simple" | "compound"
  grace_days: number
  whatsapp_templates: unknown
}

/** Full editable shop row for the settings page. Server-side only. */
export async function getShopSettings(
  shopId: string
): Promise<ShopSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("shops")
    .select("id, name, phone, address, upi_id, interest_mode, grace_days, whatsapp_templates")
    .eq("id", shopId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load shop settings: ${error.message}`)
  }

  return data as ShopSettings | null
}

/** All slabs for a shop, ordered by min_amount. Server-side only. */
export async function listSlabs(shopId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("slabs")
    .select("id, min_amount, max_amount, rate_monthly")
    .eq("shop_id", shopId)
    .order("min_amount")

  if (error) {
    throw new Error(`Failed to load slabs: ${error.message}`)
  }

  return (data ?? []) as {
    id: string
    min_amount: number
    max_amount: number
    rate_monthly: number
  }[]
}
