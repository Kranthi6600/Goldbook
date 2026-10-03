import { z } from "zod"

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
] as const

export const PaymentSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(10000000, "Amount cannot exceed ₹1,00,00,000"),
  method: z.enum(["cash", "upi", "bank", "other"]),
  kind: z.enum(["interest", "principal", "mixed"]),
  reference: z.string().trim().max(100).optional(),
  paid_at: z
    .string()
    .min(1, "Payment date is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date"),
  notes: z.string().trim().max(500).optional(),
})

/** Form-side schema: additionally caps amount at the current loan balance. */
export const createPaymentSchema = (maxBalance: number) =>
  PaymentSchema.extend({
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .max(maxBalance, `Amount cannot exceed the balance of ₹${maxBalance}`),
  })

export type PaymentFormValues = z.infer<typeof PaymentSchema>
