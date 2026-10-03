/**
 * WhatsApp message templates — single source of truth for defaults.
 *
 * Placeholders look like {{customer_name}}. Missing keys are LEFT AS-IS
 * (renders "{{customer_name}}" literally) so template mistakes are visible
 * in the sent message instead of silently blank.
 */

import { BRAND } from "@/lib/brand"

export const TEMPLATE_KEYS = [
  "receipt",
  "reminder_7d",
  "reminder_3d",
  "reminder_1d",
  "overdue",
  "payment_confirm",
  "statement",
] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export type WhatsAppTemplates = Record<TemplateKey, string>

export const DEFAULT_TEMPLATES: WhatsAppTemplates = {
  receipt:
    "Gold Loan Receipt — {{shop_name}}\n\nLoan No: {{loan_number}}\nCustomer: {{customer_name}}\nAmount: {{loan_amount}}\nDue date: {{due_date}}\n\nPay via UPI: {{upi_link}}\nYour digital passbook: {{passbook_url}}\n\nThank you!",
  reminder_7d:
    "Payment reminder — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} is due on {{due_date}}.\nAmount due: {{total_due}}\n\nPay via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
  reminder_3d:
    "Payment reminder — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} is due on {{due_date}} (in {{days}} days).\nAmount due: {{total_due}}\n\nPay via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
  reminder_1d:
    "Payment reminder — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} is due TOMORROW ({{due_date}}).\nAmount due: {{total_due}}\n\nPay via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
  overdue:
    "OVERDUE — {{shop_name}}\n\nDear {{customer_name}},\nYour gold loan {{loan_number}} was due on {{due_date}} ({{days}} days overdue).\nAmount due: {{total_due}}\n\nPlease pay immediately via UPI: {{upi_link}}\nPassbook: {{passbook_url}}",
  payment_confirm:
    "Payment received — {{shop_name}}\n\nDear {{customer_name}},\nWe received {{payment_amount}} for loan {{loan_number}}.\nRemaining balance: {{balance}}\n\nThank you!",
  statement:
    "Loan statement — {{shop_name}}\n\nDear {{customer_name}},\nPlease find your statement for loan {{loan_number}} attached.\nBalance: {{total_due}}\n\nThank you!",
}

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  receipt: "Loan receipt",
  reminder_7d: "Reminder — 7 days before",
  reminder_3d: "Reminder — 3 days before",
  reminder_1d: "Reminder — 1 day before",
  overdue: "Overdue notice",
  payment_confirm: "Payment confirmation",
  statement: "Statement cover note",
}

/** All placeholders the renderers actually supply. */
export const TEMPLATE_PLACEHOLDERS = [
  "customer_name",
  "loan_number",
  "loan_amount",
  "total_due",
  "due_date",
  "shop_name",
  "upi_link",
  "passbook_url",
  "payment_amount",
  "balance",
  "days",
] as const

/** Sample values for the settings-page live preview. */
export const SAMPLE_VARS: Record<string, string> = {
  customer_name: "Ramesh Kumar",
  loan_number: "GL-2026-0042",
  loan_amount: "₹50,000",
  total_due: "₹51,500",
  due_date: "15 Jan 2026",
  shop_name: "Sri Lakshmi Gold Loans",
  upi_link: "lakshmi@upi",
  passbook_url: `${BRAND.appUrl ?? "http://localhost:3000"}/p/abc123`,
  payment_amount: "₹5,000",
  balance: "₹46,500",
  days: "3",
}

/** Replace every {{key}} with vars[key]. Unknown keys stay literal. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  )
}

/** Fill any missing keys from defaults — for shops saved before a key existed. */
export function mergeWithDefaults(
  templates: unknown
): WhatsAppTemplates {
  const src =
    templates && typeof templates === "object"
      ? (templates as Record<string, unknown>)
      : {}
  const out = {} as WhatsAppTemplates
  for (const key of TEMPLATE_KEYS) {
    const v = src[key]
    out[key] = typeof v === "string" && v.length > 0 ? v : DEFAULT_TEMPLATES[key]
  }
  return out
}
