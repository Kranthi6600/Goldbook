import { createClient } from "@/lib/supabase/server"

export type StaffRow = {
  id: string
  user_id: string | null
  invited_email: string | null
  role: string
  accepted_at: string | null
  created_at: string
}

/**
 * Staff + pending invites for a shop. Members can read via RLS
 * (is_shop_member). Owner-only gating happens in the page, not here.
 * auth.users emails aren't exposed via PostgREST — accepted members show a
 * masked user id until they set invited_email at invite time anyway.
 */
export async function listStaff(shopId: string): Promise<StaffRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("shop_staff")
    .select("id, user_id, invited_email, role, accepted_at, created_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to load staff: ${error.message}`)
  }

  return (data ?? []) as StaffRow[]
}
