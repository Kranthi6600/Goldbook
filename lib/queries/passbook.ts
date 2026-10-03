import { createAdminClient } from "@/lib/supabase/admin"
import { getLoanSummaries } from "@/lib/queries/loan-summaries"
import type { PaymentRow } from "@/lib/queries/loans"

/**
 * Passbook data for the public /p/[token] page.
 * Uses the service-role client — server components only.
 * IMPORTANT: never expose customer_id, shop_id, or loan ids to the client.
 */

export type PassbookShop = {
  name: string
  phone: string
  upi_id: string | null
  logo_url: string | null
}

export type PassbookLoan = {
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
  summary: {
    interest_accrued: number
    total_due: number
    total_paid: number
    balance: number
  }
  payments: {
    amount: number
    method: string
    kind: string
    paid_at: string
  }[]
}

export type PassbookData = {
  shop: PassbookShop
  customer: { name: string }
  loans: PassbookLoan[]
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPassbookData(
  token: string
): Promise<PassbookData | null> {
  if (!UUID_RE.test(token)) {
    return null
  }

  const supabase = createAdminClient()

  const { data: tokenRow, error: tokenError } = await supabase
    .from("passbook_tokens")
    .select("customer_id, shop_id, expires_at, revoked")
    .eq("token", token)
    .maybeSingle()

  if (tokenError || !tokenRow) {
    return null
  }
  const t = tokenRow as {
    customer_id: string
    shop_id: string
    expires_at: string
    revoked: boolean
  }

  if (t.revoked || new Date(t.expires_at).getTime() <= Date.now()) {
    return null
  }

  const [shopRes, customerRes, loansRes] = await Promise.all([
    supabase
      .from("shops")
      .select("name, phone, upi_id, logo_url")
      .eq("id", t.shop_id)
      .single(),
    supabase
      .from("customers")
      .select("name")
      .eq("id", t.customer_id)
      .single(),
    supabase
      .from("loans")
      .select(
        "id, loan_number, gold_weight_g, gold_purity, gold_description, loan_amount, rate_monthly, interest_mode, start_date, due_date, status"
      )
      .eq("customer_id", t.customer_id)
      .order("created_at", { ascending: false }),
  ])

  if (shopRes.error || customerRes.error || loansRes.error) {
    throw new Error(
      `Failed to load passbook: ${
        shopRes.error?.message ??
        customerRes.error?.message ??
        loansRes.error?.message
      }`
    )
  }

  type LoanRow = {
    id: string
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
  }

  const loanRows = (loansRes.data ?? []) as LoanRow[]

  // All summaries in ONE RPC — SQL is the source of truth, no N+1.
  const summaries = await getLoanSummaries(
    loanRows.map((l) => l.id),
    supabase
  )

  const loans: PassbookLoan[] = await Promise.all(
    loanRows.map(async (l) => {
      const paymentsRes = await supabase
        .from("payments")
        .select("amount, method, kind, paid_at")
        .eq("loan_id", l.id)
        .order("paid_at", { ascending: false })

      const summary = summaries.get(l.id)

      return {
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
        summary: {
          interest_accrued: Number(summary?.interest_accrued ?? 0),
          total_due: Number(summary?.total_due ?? l.loan_amount),
          total_paid: Number(summary?.total_paid ?? 0),
          balance: Number(summary?.balance ?? l.loan_amount),
        },
        payments: ((paymentsRes.data ?? []) as (PaymentRow & {
          kind: string
        })[]).map((p) => ({
          amount: Number(p.amount),
          method: p.method,
          kind: p.kind,
          paid_at: p.paid_at,
        })),
      }
    })
  )

  const shop = shopRes.data as PassbookShop
  const customer = customerRes.data as { name: string }

  return {
    shop,
    customer: { name: customer.name },
    loans,
  }
}

/** Records a passbook view. Best-effort — failures must not break the page. */
export async function logPassbookView(token: string): Promise<void> {
  if (!UUID_RE.test(token)) return
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("log_passbook_view", {
    p_token: token,
  })
  if (error) {
    console.error("log_passbook_view failed:", error.message)
  }
}
