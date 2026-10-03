import { z } from "zod"

import { normalizePhone } from "@/lib/utils/phone"

export const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "pan", label: "PAN" },
  { value: "voter_id", label: "Voter ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "other", label: "Other" },
] as const

export const CustomerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().regex(/^\+91\d{10}$/, "Enter a valid Indian phone number")
    ),
  address: z.string().trim().max(500).optional(),
  id_type: z.union([
    z.literal(""),
    z.enum(["aadhaar", "pan", "voter_id", "driving_license", "other"]),
  ]),
  id_number: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(1000).optional(),
})

export type CustomerFormValues = z.input<typeof CustomerSchema>
export type CustomerInput = z.output<typeof CustomerSchema>
