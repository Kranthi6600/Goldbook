"use server"

import { createClient } from "@/lib/supabase/server"
import { LeadSchema } from "@/lib/schemas/lead"

/**
 * Public demo-request form handler. Anon SSR client — inserts only;
 * the leads_public_insert policy (with check true) allows this and nothing else.
 */
export async function createLead(input: unknown): Promise<{ error?: string }> {
  const parsed = LeadSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const supabase = await createClient()
  const v = parsed.data

  const { error } = await supabase.from("leads").insert({
    name: v.name,
    shop_name: v.shop_name,
    city: v.city,
    phone: v.phone,
    active_pledges: v.active_pledges,
    current_method: v.current_method,
    source: "website",
  })

  if (error) {
    console.error("[createLead] insert failed:", error)
    return {
      error: `Could not submit (${error.code ?? error.message}). Please try again or WhatsApp us.`,
    }
  }

  return {}
}
