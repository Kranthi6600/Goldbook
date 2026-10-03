"use server"

import * as React from "react"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { pdf, type DocumentProps } from "@react-pdf/renderer"
import { format } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import {
  EditDueDateSchema,
  LoanActionReasonSchema,
} from "@/lib/schemas/loan-actions"
import { LoanStatement } from "@/lib/pdf/LoanStatement"
import type { LoanSummaryRow } from "@/lib/queries/loans"
import {
  buildReminderMessage,
  passbookUrl,
  waLink,
} from "@/lib/utils/whatsapp"
import { mergeWithDefaults, type TemplateKey } from "@/lib/utils/template"
import { formatINR } from "@/lib/utils/money"

async function getShopAndUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." as const }
  }

  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, name, phone, upi_id, whatsapp_templates")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!shop) {
    return { error: "Shop not found. Complete onboarding first." }
  }

  return {
    supabase,
    shopId: (shop as { id: string }).id,
    shopInfo: shop as {
      id: string
      name: string
      phone: string
      upi_id: string | null
      whatsapp_templates: unknown
    },
    userId: user.id,
  }
}

function revalidateLoan(loanId: string) {
  revalidatePath(`/loans/${loanId}`)
  revalidatePath("/loans")
  revalidatePath("/")
}

// ---------------------------------------------------------------------------
// closeLoan — manual administrative close (full-payment close lives in
// recordPayment). The RPC guards membership + open status and writes an
// audit_log row carrying the reason.
// ---------------------------------------------------------------------------
export async function closeLoan(
  loanId: string,
  reason: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(loanId).success) {
    return { error: "Invalid loan id." }
  }
  const parsed = LoanActionReasonSchema.safeParse(reason)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reason." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }

  const { error } = await result.supabase.rpc("close_loan", {
    p_loan_id: loanId,
    p_reason: parsed.data,
  })
  if (error) {
    return { error: error.message }
  }

  revalidateLoan(loanId)
  return {}
}

// ---------------------------------------------------------------------------
// editLoanDueDate — RPC validates new_due_date > start_date and audits the
// before/after + reason.
// ---------------------------------------------------------------------------
export async function editLoanDueDate(
  loanId: string,
  newDate: string,
  reason: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(loanId).success) {
    return { error: "Invalid loan id." }
  }
  const parsed = EditDueDateSchema.safeParse({ newDueDate: newDate, reason })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }

  const { error } = await result.supabase.rpc("edit_loan_due_date", {
    p_loan_id: loanId,
    p_new_due_date: parsed.data.newDueDate,
    p_reason: parsed.data.reason,
  })
  if (error) {
    return { error: error.message }
  }

  revalidateLoan(loanId)
  return {}
}

// ---------------------------------------------------------------------------
// revokePassbook — kills every non-revoked token for the customer.
// ---------------------------------------------------------------------------
export async function revokePassbook(
  customerId: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(customerId).success) {
    return { error: "Invalid customer id." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }

  const { error } = await result.supabase.rpc("revoke_passbook", {
    p_customer_id: customerId,
  })
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/")
  return {}
}

// ---------------------------------------------------------------------------
// sendLoanReminder — builds the WhatsApp message from SQL-verified numbers
// (loan_summaries batch RPC), logs it to reminders, and returns the wa.me
// link for the client to open.
// ---------------------------------------------------------------------------
export async function sendLoanReminder(
  loanId: string
): Promise<{ error?: string; waUrl?: string }> {
  if (!z.uuid().safeParse(loanId).success) {
    return { error: "Invalid loan id." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }
  const { supabase, shopId, shopInfo, userId } = result

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select(
      "id, loan_number, customer_id, gold_weight_g, gold_purity, loan_amount, rate_monthly, interest_mode, start_date, due_date, status, customers(id, name, phone)"
    )
    .eq("id", loanId)
    .eq("shop_id", shopId)
    .maybeSingle()

  if (loanError) {
    return { error: loanError.message }
  }
  if (!loan) {
    return { error: "Loan not found." }
  }

  type LoanRow = {
    loan_number: string
    customer_id: string
    gold_weight_g: number
    gold_purity: string | null
    loan_amount: number
    rate_monthly: number
    interest_mode: string
    start_date: string
    due_date: string
    customers:
      | { id: string; name: string; phone: string }
      | { id: string; name: string; phone: string }[]
      | null
  }
  const l = loan as LoanRow
  const customer = Array.isArray(l.customers) ? l.customers[0] : l.customers
  if (!customer) {
    return { error: "Customer not found for this loan." }
  }
  if (!customer.phone) {
    return { error: "Customer has no phone number — add it first." }
  }

  // Source of truth: SQL summary.
  const { data: summaryRows, error: summaryError } = await supabase.rpc(
    "loan_summary",
    { p_loan_id: loanId }
  )
  if (summaryError) {
    return { error: summaryError.message }
  }
  const summary = ((summaryRows ?? []) as LoanSummaryRow[])[0]
  if (!summary) {
    return { error: "Could not load loan summary." }
  }

  const today = new Date().toISOString().slice(0, 10)
  const overdue = l.due_date < today
  const dayDiff = Math.round(
    (new Date(l.due_date).getTime() - new Date(today).getTime()) / 86400000
  )

  // Latest usable passbook token for the customer (optional link).
  const { data: tokenRow } = await supabase
    .from("passbook_tokens")
    .select("token")
    .eq("shop_id", shopId)
    .eq("customer_id", l.customer_id)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const templates = mergeWithDefaults(shopInfo.whatsapp_templates)
  const templateKey: TemplateKey = overdue
    ? "overdue"
    : dayDiff === 1
      ? "reminder_1d"
      : dayDiff === 3
        ? "reminder_3d"
        : "reminder_7d"

  const message = buildReminderMessage(templates[templateKey], {
    customer_name: customer.name,
    loan_number: l.loan_number,
    loan_amount: formatINR(Number(l.loan_amount)),
    total_due: formatINR(Math.max(0, Number(summary.balance))),
    due_date: format(new Date(l.due_date), "dd MMM yyyy"),
    days: String(Math.abs(dayDiff)),
    shop_name: shopInfo.name,
    upi_link: shopInfo.upi_id ?? "",
    passbook_url: tokenRow?.token ? passbookUrl(tokenRow.token) : "",
  })

  const { error: insertError } = await supabase.from("reminders").insert({
    loan_id: loanId,
    shop_id: shopId,
    kind: overdue ? "overdue" : "due_soon",
    channel: "whatsapp",
    sent_by: userId,
    message_body: message,
  })
  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath("/reminders")
  revalidatePath(`/loans/${loanId}`)

  return { waUrl: waLink(customer.phone, message) }
}

// ---------------------------------------------------------------------------
// sendStatement — renders the loan statement PDF server-side and returns it
// as base64. Client triggers the download; WhatsApp attach is manual (no
// WhatsApp Business API in MVP).
// ---------------------------------------------------------------------------
export async function sendStatement(
  loanId: string
): Promise<{ error?: string; base64?: string; filename?: string }> {
  if (!z.uuid().safeParse(loanId).success) {
    return { error: "Invalid loan id." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }
  const { supabase, shopId, shopInfo } = result

  const [loanRes, paymentsRes, summaryRes] = await Promise.all([
    supabase
      .from("loans")
      .select(
        "id, loan_number, gold_weight_g, gold_purity, gold_description, loan_amount, rate_monthly, interest_mode, start_date, due_date, status, customers(name, phone)"
      )
      .eq("id", loanId)
      .eq("shop_id", shopId)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("amount, method, paid_at")
      .eq("loan_id", loanId)
      .eq("shop_id", shopId)
      .order("paid_at", { ascending: false }),
    supabase.rpc("loan_summary", { p_loan_id: loanId }),
  ])

  if (loanRes.error) return { error: loanRes.error.message }
  if (!loanRes.data) return { error: "Loan not found." }
  if (paymentsRes.error) return { error: paymentsRes.error.message }
  if (summaryRes.error) return { error: summaryRes.error.message }

  type StmtLoan = {
    loan_number: string
    gold_weight_g: number
    gold_purity: string | null
    gold_description: string | null
    loan_amount: number
    rate_monthly: number
    interest_mode: string
    start_date: string
    due_date: string
    status: string
    customers: { name: string; phone: string } | { name: string; phone: string }[] | null
  }
  const l = loanRes.data as StmtLoan
  const customer = Array.isArray(l.customers) ? l.customers[0] : l.customers
  const summary = ((summaryRes.data ?? []) as LoanSummaryRow[])[0]
  if (!summary) {
    return { error: "Could not load loan summary." }
  }

  const doc = React.createElement(LoanStatement, {
    shop: {
      name: shopInfo.name,
      phone: shopInfo.phone,
      upi_id: shopInfo.upi_id,
    },
    customer: {
      name: customer?.name ?? "—",
      phone: customer?.phone ?? "—",
    },
    loan: {
      loan_number: l.loan_number,
      gold_weight_g: Number(l.gold_weight_g),
      gold_purity: l.gold_purity,
      gold_description: l.gold_description,
      loan_amount: Number(l.loan_amount),
      rate_monthly: Number(l.rate_monthly),
      interest_mode: l.interest_mode,
      start_date: l.start_date,
      due_date: l.due_date,
      status: l.status,
    },
    summary: {
      interest_accrued: Number(summary.interest_accrued),
      total_due: Number(summary.total_due),
      total_paid: Number(summary.total_paid),
      balance: Number(summary.balance),
      days_elapsed: Number(summary.days_elapsed),
    },
    payments: (paymentsRes.data ?? []).map(
      (p: { amount: number; method: string; paid_at: string }) => ({
        amount: Number(p.amount),
        method: p.method,
        paid_at: format(new Date(p.paid_at), "dd MMM yyyy, hh:mm a"),
      })
    ),
    generatedAt: format(new Date(), "dd MMM yyyy, hh:mm a"),
  })

  try {
    // react-pdf types pdf() as requiring a <Document> element; a custom
    // component rendering <Document> is fine at runtime — cast only.
    const blob = await pdf(
      doc as React.ReactElement<DocumentProps>
    ).toBlob()
    const buf = Buffer.from(await blob.arrayBuffer())
    return {
      base64: buf.toString("base64"),
      filename: `statement-${l.loan_number}.pdf`,
    }
  } catch (e) {
    return {
      error: `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
