import { z } from "zod"

import { normalizePhone } from "@/lib/utils/phone"

export const PLEDGE_RANGES = ["0", "1–25", "26–50", "51–100", "100+"] as const

export const CURRENT_METHODS = [
  "Paper register",
  "Excel",
  "Other software",
  "Nothing yet",
] as const

export const LeadSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  shop_name: z.string().trim().min(2, "Shop name is required").max(100),
  city: z.string().trim().min(2, "City is required").max(100),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().regex(/^\+91\d{10}$/, "Enter a valid Indian phone number")
    ),
  active_pledges: z.string().min(1, "Select your active pledges range"),
  current_method: z.string().min(1, "Select how you track loans today"),
})

export type LeadInput = z.input<typeof LeadSchema>
export type LeadValues = z.output<typeof LeadSchema>
