import { z } from "zod"

import { normalizePhone } from "@/lib/utils/phone"

export const SlabSchema = z.object({
  min_amount: z.number().min(0, "Min must be 0 or more"),
  max_amount: z.number().positive("Max must be greater than 0"),
  rate_monthly: z
    .number()
    .positive("Rate must be greater than 0")
    .lt(10, "Rate must be less than 10%/month"),
})

export type SlabInput = z.infer<typeof SlabSchema>

/**
 * Sorted slabs must form a continuous range:
 * each slab's min_amount must equal the previous slab's max_amount + 1.
 * Returns true when there is no overlap and no gap.
 */
export function slabsAreContinuous(
  slabs: Pick<SlabInput, "min_amount" | "max_amount">[]
): boolean {
  if (slabs.length === 0) return false
  const sorted = [...slabs].sort((a, b) => a.min_amount - b.min_amount)
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].min_amount >= sorted[i].max_amount) return false
    if (i > 0 && sorted[i].min_amount !== sorted[i - 1].max_amount + 1) {
      return false
    }
  }
  return true
}

export const SLAB_CONTINUITY_ERROR =
  "Slabs must form a continuous range: no overlaps, no gaps. Each min must equal the previous max + 1."

export const ShopSchema = z.object({
  name: z.string().trim().min(2, "Shop name is required").max(100),
  phone: z
    .string()
    .regex(/^\+91\d{10}$/, "Enter a valid Indian phone number"),
  interest_mode: z.enum(["simple", "compound"]),
  upi_id: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/, "Enter a valid UPI ID"),
  ]),
})

export type ShopInput = z.infer<typeof ShopSchema>

// `address` is collected during onboarding but NOT persisted —
// the shops table has no address column in the current schema.
export const OnboardingSchema = ShopSchema.extend({
  address: z.string().trim().max(500).optional(),
  slabs: z
    .array(SlabSchema)
    .min(1, "Add at least one slab")
    .superRefine((slabs, ctx) => {
      if (!slabsAreContinuous(slabs)) {
        ctx.addIssue({ code: "custom", message: SLAB_CONTINUITY_ERROR })
      }
    }),
})

export type OnboardingInput = z.infer<typeof OnboardingSchema>

export const DEFAULT_SLABS: SlabInput[] = [
  { min_amount: 0, max_amount: 50000, rate_monthly: 2 },
  { min_amount: 50001, max_amount: 200000, rate_monthly: 1.5 },
  { min_amount: 200001, max_amount: 99999999, rate_monthly: 1 },
]

export const SlabsSchema = z
  .array(SlabSchema)
  .min(1, "Add at least one slab")
  .superRefine((slabs, ctx) => {
    if (!slabsAreContinuous(slabs)) {
      ctx.addIssue({ code: "custom", message: SLAB_CONTINUITY_ERROR })
    }
  })

export const ShopSettingsSchema = z.object({
  name: z.string().trim().min(2, "Shop name is required").max(100),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().regex(/^\+91\d{10}$/, "Enter a valid Indian phone number")
    ),
  address: z.string().trim().max(500).optional(),
  upi_id: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/, "Enter a valid UPI ID"),
  ]),
  interest_mode: z.enum(["simple", "compound"]),
  grace_days: z
    .number()
    .int("Grace days must be a whole number")
    .min(0, "Grace days cannot be negative")
    .max(90, "Grace days cannot exceed 90"),
})

export type ShopSettingsInput = z.input<typeof ShopSettingsSchema>
export type ShopSettingsValues = z.output<typeof ShopSettingsSchema>

const TemplateValueSchema = z
  .string()
  .trim()
  .min(1, "Template cannot be empty")
  .max(1000, "Keep templates under 1000 characters")

/** Every template key must exist — a missing key would render blank messages. */
export const WhatsappTemplatesSchema = z.object({
  receipt: TemplateValueSchema,
  reminder_7d: TemplateValueSchema,
  reminder_3d: TemplateValueSchema,
  reminder_1d: TemplateValueSchema,
  overdue: TemplateValueSchema,
  payment_confirm: TemplateValueSchema,
  statement: TemplateValueSchema,
})

export type WhatsappTemplatesInput = z.infer<typeof WhatsappTemplatesSchema>
