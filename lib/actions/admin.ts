"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/queries/admin"

const LEAD_STATUSES = ["new", "contacted", "demo", "onboarded", "lost"] as const

export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<{ error?: string }> {
  const { admin } = await requireAdmin()

  if (!z.uuid().safeParse(leadId).success) {
    return { error: "Invalid lead id." }
  }
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    return { error: "Invalid status." }
  }

  const { error } = await admin
    .from("leads")
    .update({ status })
    .eq("id", leadId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin/leads")
  return {}
}
