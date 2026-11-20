import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { ShopSummary } from "@/lib/queries/shops"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component where cookies cannot be set.
            // Safe to ignore because middleware refreshes the session.
          }
        },
      },
    }
  )
}

export async function getCurrentShopContext(): Promise<{
  shopId?: string
  shop?: ShopSummary
  error?: string
}> {
  const supabase = await createClient()
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be signed in." }
  }

  // Check if user is owner
  const { data: owned, error: ownError } = await supabase
    .from("shops")
    .select("id, name, interest_mode, plan")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (ownError) {
    return { error: ownError.message }
  }
  if (owned) {
    return {
      shopId: owned.id,
      shop: { ...owned, role: "owner" as const },
    }
  }

  // Check if user is staff
  const { data: membership, error: staffError } = await supabase
    .from("shop_staff")
    .select("shop_id, shops(id, name, interest_mode, plan)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (staffError) {
    return { error: staffError.message }
  }

  const joined = membership as {
    shops:
      | { id: string; name: string; interest_mode: "simple" | "compound"; plan: string }
      | { id: string; name: string; interest_mode: "simple" | "compound"; plan: string }[]
      | null
  } | null
  const shop = Array.isArray(joined?.shops) ? joined?.shops[0] : joined?.shops
  if (!shop) {
    return { error: "Shop not found. Complete onboarding first." }
  }

  return {
    shopId: shop.id,
    shop: { ...shop, role: "staff" as const },
  }
}
