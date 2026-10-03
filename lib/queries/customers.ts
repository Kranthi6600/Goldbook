import { createClient } from "@/lib/supabase/server"

export type CustomerRow = {
  id: string
  name: string
  phone: string
  address: string | null
  id_type: string | null
  id_number: string | null
  notes: string | null
  created_at: string
}

export type CustomerListItem = CustomerRow & {
  activeLoanCount: number
  outstanding: number
}

export type CustomerLoanRow = {
  id: string
  loan_number: string
  loan_amount: number
  rate_monthly: number
  interest_mode: string
  start_date: string
  due_date: string
  status: string
  gold_weight_g: number
  gold_purity: string | null
}

export type CustomerSearchResult = Pick<
  CustomerRow,
  "id" | "name" | "phone"
>

const CUSTOMER_COLUMNS =
  "id, name, phone, address, id_type, id_number, notes, created_at"

type CustomerLoanStatsRow = {
  customer_id: string
  active_loan_count: number
  outstanding: number
}

/** Neutralize ilike wildcards and PostgREST `or()` special characters. */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_.,()'"\\]/g, " ").replace(/\s+/g, " ").trim()
}

export async function listCustomers(
  shopId: string,
  search?: string
): Promise<CustomerListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("shop_id", shopId)
    .order("name")
    .limit(100)

  const term = search ? sanitizeSearchTerm(search) : ""
  if (term) {
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const [customersRes, statsRes] = await Promise.all([
    query,
    supabase.rpc("customer_loan_stats", { p_shop_id: shopId }),
  ])

  if (customersRes.error) {
    throw new Error(`Failed to load customers: ${customersRes.error.message}`)
  }
  if (statsRes.error) {
    throw new Error(
      `Failed to load customer loan stats: ${statsRes.error.message}`
    )
  }

  const statsMap = new Map(
    ((statsRes.data ?? []) as CustomerLoanStatsRow[]).map((s) => [
      s.customer_id,
      s,
    ])
  )

  return ((customersRes.data ?? []) as CustomerRow[]).map((c) => ({
    ...c,
    activeLoanCount: Number(statsMap.get(c.id)?.active_loan_count ?? 0),
    outstanding: Number(statsMap.get(c.id)?.outstanding ?? 0),
  }))
}

export async function getCustomer(
  shopId: string,
  customerId: string
): Promise<{
  customer: CustomerRow | null
  loans: CustomerLoanRow[]
  stats: { activeLoanCount: number; outstanding: number }
}> {
  const supabase = await createClient()

  const [customerRes, loansRes, statsRes] = await Promise.all([
    supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("shop_id", shopId)
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("loans")
      .select(
        "id, loan_number, loan_amount, rate_monthly, interest_mode, start_date, due_date, status, gold_weight_g, gold_purity"
      )
      .eq("shop_id", shopId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase.rpc("customer_loan_stats", { p_shop_id: shopId }),
  ])

  if (customerRes.error) {
    throw new Error(`Failed to load customer: ${customerRes.error.message}`)
  }
  if (loansRes.error) {
    throw new Error(`Failed to load customer loans: ${loansRes.error.message}`)
  }
  if (statsRes.error) {
    throw new Error(
      `Failed to load customer loan stats: ${statsRes.error.message}`
    )
  }

  const statRow = ((statsRes.data ?? []) as CustomerLoanStatsRow[]).find(
    (s) => s.customer_id === customerId
  )

  return {
    customer: customerRes.data as CustomerRow | null,
    loans: (loansRes.data ?? []) as CustomerLoanRow[],
    stats: {
      activeLoanCount: Number(statRow?.active_loan_count ?? 0),
      outstanding: Number(statRow?.outstanding ?? 0),
    },
  }
}

/**
 * Fast name/phone search for autocomplete (e.g. loan creation).
 * Empty term returns the first `limit` customers alphabetically —
 * the picker uses this as its "browse all" list on focus.
 */
export async function searchCustomers(
  shopId: string,
  query: string,
  limit = 10
): Promise<CustomerSearchResult[]> {
  const term = sanitizeSearchTerm(query)

  const supabase = await createClient()
  let q = supabase
    .from("customers")
    .select("id, name, phone")
    .eq("shop_id", shopId)

  if (term) {
    q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const { data, error } = await q.order("name").limit(limit)

  if (error) {
    throw new Error(`Failed to search customers: ${error.message}`)
  }

  return (data ?? []) as CustomerSearchResult[]
}
