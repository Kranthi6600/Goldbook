import { z } from "zod"

import { normalizePhone } from "@/lib/utils/phone"

export const GOLD_PURITIES = [
  { value: "22K", label: "22K" },
  { value: "20K", label: "20K" },
  { value: "18K", label: "18K" },
  { value: "other", label: "Other" },
] as const

export const NewCustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required").max(100),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().regex(/^\+91\d{10}$/, "Enter a valid Indian phone number")
    ),
})

// Fields the server accepts for loan creation. rate_monthly is NOT here —
// it is derived from the shop's slab table server-side (financial integrity:
// the client cannot dictate the interest rate).
const LoanCreateFields = z.object({
  customer_id: z.union([z.literal(""), z.uuid()]).optional(),
  new_customer: NewCustomerSchema.optional(),
  gold_weight_g: z
    .number()
    .min(0.1, "Weight must be at least 0.1 g")
    .max(10000, "Weight cannot exceed 10,000 g"),
  gold_purity: z.enum(["22K", "20K", "18K", "other"]),
  gold_description: z.string().trim().max(500).optional(),
  loan_amount: z
    .number()
    .min(100, "Loan amount must be at least ₹100")
    .max(10000000, "Loan amount cannot exceed ₹1,00,00,000"),
  start_date: z.iso.date("Enter a valid start date"),
  due_date: z.iso.date("Enter a valid due date"),
  interest_mode: z.enum(["simple", "compound"]),
})

const loanRefinements = (v: z.infer<typeof LoanCreateFields>, ctx: z.RefinementCtx) => {
    const hasCustomer = !!v.customer_id
    const hasNew = !!v.new_customer

    if (hasCustomer === hasNew) {
      ctx.addIssue({
        code: "custom",
        path: ["customer_id"],
        message: "Select an existing customer or enter a new one.",
      })
    }

    if (v.due_date <= v.start_date) {
      ctx.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Due date must be after the start date.",
      })
    }
  }

export const LoanCreateSchema = LoanCreateFields.superRefine(loanRefinements)

// Client-side form schema: adds rate_monthly purely for the live preview and
// rate autofill. It is stripped from the payload before createLoan is called.
export const LoanFormSchema = LoanCreateFields.extend({
  rate_monthly: z
    .number()
    .positive("Rate must be greater than 0")
    .lt(10, "Rate must be less than 10%/month"),
}).superRefine(loanRefinements)

export type LoanCreateInput = z.output<typeof LoanCreateSchema>
export type LoanFormValues = z.input<typeof LoanFormSchema>
export type LoanFormOutput = z.output<typeof LoanFormSchema>
