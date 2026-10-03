import { z } from "zod"

/** Shared between loan-action dialogs (client) and loan-actions (server). */

export const LoanActionReasonSchema = z
  .string()
  .trim()
  .min(5, "Give a short reason (at least 5 characters).")
  .max(500, "Reason too long.")

export const EditDueDateSchema = z.object({
  newDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
  reason: LoanActionReasonSchema,
})

export type EditDueDateValues = z.infer<typeof EditDueDateSchema>
