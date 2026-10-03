import { createClient } from "@/lib/supabase/server"

export type DashboardStats = {
  totalOutstanding: number
  overdueCount: number
  overdueAmount: number
  todayCollections: number
  goldInCustodyG: number
  pendingReminders: number
  loanCount: number
}

type DashboardStatsRow = {
  total_outstanding: number
  overdue_count: number
  overdue_amount: number
  today_collections: number
  gold_in_custody_g: number
  pending_reminders: number
  loan_count: number
}

const ZERO_STATS: DashboardStats = {
  totalOutstanding: 0,
  overdueCount: 0,
  overdueAmount: 0,
  todayCollections: 0,
  goldInCustodyG: 0,
  pendingReminders: 0,
  loanCount: 0,
}

/** Single aggregate RPC — no per-loan loops. Requires migration 002. */
export async function getDashboardStats(
  shopId: string
): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("dashboard_stats", {
    p_shop_id: shopId,
  })

  if (error) {
    throw new Error(`Failed to load dashboard stats: ${error.message}`)
  }

  const row = (data as DashboardStatsRow[] | null)?.[0]
  if (!row) {
    return ZERO_STATS
  }

  return {
    totalOutstanding: Number(row.total_outstanding),
    overdueCount: Number(row.overdue_count),
    overdueAmount: Number(row.overdue_amount),
    todayCollections: Number(row.today_collections),
    goldInCustodyG: Number(row.gold_in_custody_g),
    pendingReminders: Number(row.pending_reminders),
    loanCount: Number(row.loan_count),
  }
}
