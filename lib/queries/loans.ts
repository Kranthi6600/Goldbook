import { createClient } from "@/lib/supabase/server"
import { getLoanSummaries } from "@/lib/queries/loan-summaries"
import type { LoanSummary } from "@/lib/queries/loan-summary"
import { sanitizeSearchTerm } from "@/lib/queries/customers"

export type DisplayStatus =
  | "active"
  | "due_soon"
  | "overdue"
  | "closed"
  | "auctioned"
  | "written_off"

export type LoanStatusFilter = "all" | "active" | "due_soon" | "overdue" | "closed"

export type LoanListFilters = {
  status?: LoanStatusFilter
  search?: string
  /** start_date gte (ISO date) */
  from?: string
  /** start_date lte (ISO date) */
  to?: string
}

export type LoanListItem = {
  id: string
  loan_number: string
  customer_name: string
  gold_weight_g: number
  gold_purity: string | null
  loan_amount: number
  due_date: string
  status: string
  displayStatus: DisplayStatus
  balance: number
  interest_accrued: number
  total_due: number
}

export type LoanDetail = {
  id: string
  loan_number: string
  gold_weight_g: number
  gold_purity: string | null
  gold_description: string | null
  loan_amount: number
  rate_monthly: number
  interest_mode: "simple" | "compound"
  start_date: string
  due_date: string
  status: string
  created_at: string
  customers: { id: string; name: string; phone: string } | null
}

export type PaymentRow = {
  id: string
  amount: number
  method: string
  kind: string
  reference: string | null
  paid_at: string
}

/** Kept for existing consumers — canonical type lives in loan-summary.ts. */
export type LoanSummaryRow = LoanSummary

export type AuditRow = {
  id: string
  action: string
  created_at: string
}

const DUE_SOON_DAYS = 7

type EmbeddedLoan = {
  id: string
  loan_number: string
  gold_weight_g: number
  gold_purity: string | null
  loan_amount: number
  rate_monthly: number
  interest_mode: "simple" | "compound"
  start_date: string
  due_date: string
  status: string
  created_at: string
  customers: { name: string } | { name: string }[] | null
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toDisplayStatus(status: string, dueDate: string, today: string): DisplayStatus {
  if (status === "active") {
    const soonLimit = isoDay(new Date(Date.now() + DUE_SOON_DAYS * 86400000))
    if (dueDate < today) return "overdue"
    if (dueDate <= soonLimit) return "due_soon"
    return "active"
  }
  if (status === "overdue") return "overdue"
  if (status === "auctioned") return "auctioned"
  if (status === "written_off") return "written_off"
  return "closed"
}

export async function listLoans(
  shopId: string,
  filters: LoanListFilters = {},
  page = 1,
  limit = 50
): Promise<{ loans: LoanListItem[]; total: number; page: number; pageCount: number }> {
  const supabase = await createClient()
  const today = isoDay(new Date())
  const soonLimit = isoDay(new Date(Date.now() + DUE_SOON_DAYS * 86400000))

  let query = supabase
    .from("loans")
    .select(
      "id, loan_number, gold_weight_g, gold_purity, loan_amount, rate_monthly, interest_mode, start_date, due_date, status, created_at, customers!inner(name)",
      { count: "exact" }
    )
    .eq("shop_id", shopId)

  switch (filters.status) {
    case "active":
      query = query.eq("status", "active").gt("due_date", soonLimit)
      break
    case "due_soon":
      query = query
        .eq("status", "active")
        .gte("due_date", today)
        .lte("due_date", soonLimit)
      break
    case "overdue":
      // status='overdue' (cron-set) OR active with a past due date
      query = query.or(
        `status.eq.overdue,and(status.eq.active,due_date.lt.${today})`
      )
      break
    case "closed":
      query = query.in("status", ["closed", "auctioned", "written_off"])
      break
    default:
      break
  }

  const term = filters.search ? sanitizeSearchTerm(filters.search) : ""
  if (term) {
    query = query.or(
      `loan_number.ilike.%${term}%,customers.name.ilike.%${term}%`
    )
  }

  if (filters.from) query = query.gte("start_date", filters.from)
  if (filters.to) query = query.lte("start_date", filters.to)

  const safePage = Math.max(1, page)
  const from = (safePage - 1) * limit
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1)

  if (error) {
    throw new Error(`Failed to load loans: ${error.message}`)
  }

  const rows = (data ?? []) as EmbeddedLoan[]

  // SQL is the source of truth for balances — one batched RPC, no N+1.
  const summaries = await getLoanSummaries(rows.map((l) => l.id))

  const loans = rows.map((l) => {
    const customer = Array.isArray(l.customers)
      ? l.customers[0]
      : l.customers
    const summary = summaries.get(l.id)
    if (!summary) {
      throw new Error(`No loan summary for loan ${l.id}`)
    }

    return {
      id: l.id,
      loan_number: l.loan_number,
      customer_name: customer?.name ?? "—",
      gold_weight_g: Number(l.gold_weight_g),
      gold_purity: l.gold_purity,
      loan_amount: Number(l.loan_amount),
      due_date: l.due_date,
      status: l.status,
      interest_accrued: Math.max(0, summary.interest_accrued),
      total_due: Math.max(0, summary.total_due),
      displayStatus: toDisplayStatus(l.status, l.due_date, today),
      balance: Math.max(0, summary.balance),
    }
  })

  return {
    loans,
    total: count ?? 0,
    page: safePage,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / limit)),
  }
}

export async function getLoan(
  shopId: string,
  loanId: string
): Promise<{
  loan: LoanDetail | null
  payments: PaymentRow[]
  summary: LoanSummaryRow | null
  audit: AuditRow[]
}> {
  const supabase = await createClient()

  const [loanRes, paymentsRes, summaryRes, auditRes] = await Promise.all([
    supabase
      .from("loans")
      .select(
        "id, loan_number, gold_weight_g, gold_purity, gold_description, loan_amount, rate_monthly, interest_mode, start_date, due_date, status, created_at, customers(id, name, phone)"
      )
      .eq("shop_id", shopId)
      .eq("id", loanId)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount, method, kind, reference, paid_at")
      .eq("loan_id", loanId)
      .eq("shop_id", shopId)
      .order("paid_at", { ascending: false }),
    supabase.rpc("loan_summary", { p_loan_id: loanId }),
    supabase
      .from("audit_log")
      .select("id, action, created_at")
      .eq("shop_id", shopId)
      .eq("entity", "loan")
      .eq("entity_id", loanId)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (loanRes.error) {
    throw new Error(`Failed to load loan: ${loanRes.error.message}`)
  }
  if (paymentsRes.error) {
    throw new Error(`Failed to load payments: ${paymentsRes.error.message}`)
  }
  if (summaryRes.error) {
    throw new Error(`Failed to load loan summary: ${summaryRes.error.message}`)
  }
  if (auditRes.error) {
    throw new Error(`Failed to load audit log: ${auditRes.error.message}`)
  }

  return {
    loan: loanRes.data as LoanDetail | null,
    payments: (paymentsRes.data ?? []) as PaymentRow[],
    summary: ((summaryRes.data ?? []) as LoanSummaryRow[])[0] ?? null,
    audit: (auditRes.data ?? []) as AuditRow[],
  }
}
