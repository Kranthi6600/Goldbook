import { createClient } from "@/lib/supabase/server"
import { getLoanSummaries } from "@/lib/queries/loan-summaries"

export type ReminderKind = "7d" | "3d" | "1d" | "overdue"

export type ReminderLoanItem = {
  loan_id: string
  loan_number: string
  customer_id: string
  customer_name: string
  customer_phone: string
  gold_weight_g: number
  gold_purity: string | null
  loan_amount: number
  rate_monthly: number
  interest_mode: "simple" | "compound"
  start_date: string
  due_date: string
  total_due: number
  days_to_due: number
  passbook_token: string | null
}

export type ReminderQueue = Record<ReminderKind, ReminderLoanItem[]>

type EmbeddedReminderLoan = {
  id: string
  loan_number: string
  customer_id: string
  gold_weight_g: number
  gold_purity: string | null
  loan_amount: number
  rate_monthly: number
  interest_mode: "simple" | "compound"
  start_date: string
  due_date: string
  status: string
  customers: { id: string; name: string; phone: string } | { id: string; name: string; phone: string }[] | null
}

const IST_OFFSET_MINUTES = 330

function istToday(): Date {
  const nowUtc = Date.now()
  return new Date(nowUtc + IST_OFFSET_MINUTES * 60000)
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

/** Loans due for each reminder kind, minus ones already reminded today (IST). */
export async function getTodayReminders(shopId: string): Promise<ReminderQueue> {
  const supabase = await createClient()

  const istNow = istToday()
  const today = isoDay(istNow)
  const d1 = isoDay(addDays(istNow, 1))
  const d3 = isoDay(addDays(istNow, 3))
  const d7 = isoDay(addDays(istNow, 7))

  // IST midnight as an instant, for the "already sent today" check.
  const istStartUtc = new Date(istNow.getTime() - IST_OFFSET_MINUTES * 60000)
  istStartUtc.setUTCHours(0, 0, 0, 0)
  const istStartIso = new Date(
    istStartUtc.getTime() - IST_OFFSET_MINUTES * 60000
  ).toISOString()

  const [loansRes, sentRes] = await Promise.all([
    supabase
      .from("loans")
      .select(
        "id, loan_number, customer_id, gold_weight_g, gold_purity, loan_amount, rate_monthly, interest_mode, start_date, due_date, status, customers(id, name, phone)"
      )
      .eq("shop_id", shopId)
      .in("status", ["active", "overdue"])
      .or(
        `due_date.eq.${d7},due_date.eq.${d3},due_date.eq.${d1},due_date.lt.${today}`
      )
      .order("due_date"),
    supabase
      .from("reminders")
      .select("loan_id, kind")
      .eq("shop_id", shopId)
      .gte("sent_at", istStartIso),
  ])

  if (loansRes.error) {
    throw new Error(`Failed to load reminder queue: ${loansRes.error.message}`)
  }
  if (sentRes.error) {
    throw new Error(`Failed to load sent reminders: ${sentRes.error.message}`)
  }

  const sentToday = new Set(
    ((sentRes.data ?? []) as { loan_id: string; kind: string }[]).map(
      (r) => `${r.loan_id}|${r.kind}`
    )
  )

  const loans = (loansRes.data ?? []) as EmbeddedReminderLoan[]

  // Passbook tokens for the customers in the queue.
  const customerIds = [...new Set(loans.map((l) => l.customer_id))]
  const tokenMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: tokens, error: tokenError } = await supabase
      .from("passbook_tokens")
      .select("token, customer_id")
      .eq("shop_id", shopId)
      .eq("revoked", false)
      .in("customer_id", customerIds)
      .gt("expires_at", new Date().toISOString())

    if (tokenError) {
      throw new Error(`Failed to load passbook tokens: ${tokenError.message}`)
    }
    for (const t of (tokens ?? []) as { token: string; customer_id: string }[]) {
      if (!tokenMap.has(t.customer_id)) tokenMap.set(t.customer_id, t.token)
    }
  }

  // SQL is the source of truth for amounts — one batched RPC, no N+1.
  const summaries = await getLoanSummaries(loans.map((l) => l.id))

  const queue: ReminderQueue = { "7d": [], "3d": [], "1d": [], overdue: [] }

  for (const l of loans) {
    const kind: ReminderKind =
      l.due_date < today
        ? "overdue"
        : l.due_date === d7
          ? "7d"
          : l.due_date === d3
            ? "3d"
            : "1d"

    if (sentToday.has(`${l.id}|${kind}`)) continue

    const customer = Array.isArray(l.customers) ? l.customers[0] : l.customers
    if (!customer) continue

    const summary = summaries.get(l.id)
    if (!summary) {
      throw new Error(`No loan summary for loan ${l.id}`)
    }
    // "Amount due" in the WhatsApp message = outstanding balance (SQL-computed).
    const totalDue = Math.max(0, summary.balance)

    const dueMs = new Date(l.due_date).getTime()
    const todayMs = new Date(today).getTime()
    const daysToDue = Math.round((dueMs - todayMs) / 86400000)

    queue[kind].push({
      loan_id: l.id,
      loan_number: l.loan_number,
      customer_id: l.customer_id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      gold_weight_g: Number(l.gold_weight_g),
      gold_purity: l.gold_purity,
      loan_amount: Number(l.loan_amount),
      rate_monthly: Number(l.rate_monthly),
      interest_mode: l.interest_mode,
      start_date: l.start_date,
      due_date: l.due_date,
      total_due: totalDue,
      days_to_due: daysToDue,
      passbook_token: tokenMap.get(l.customer_id) ?? null,
    })
  }

  return queue
}
