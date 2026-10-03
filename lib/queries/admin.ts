import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/utils/admin"

/**
 * Admin guard + service-role client factory.
 * Every admin query calls this — defense in depth on top of middleware
 * and the admin layout check. Redirects non-admins to "/".
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    redirect("/")
  }

  return { user, admin: createAdminClient() }
}

const STARTER_MRR = 999

export type AdminStats = {
  totalShops: number
  activeShops: number
  mrr: number
  totalLoans: number
  totalCustomers: number
  leadsThisWeek: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const { admin } = await requireAdmin()

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [shops, subs, loans, customers, leads] = await Promise.all([
    admin.from("shops").select("id", { count: "exact", head: true }),
    admin
      .from("subscriptions")
      .select("status", { count: "exact" })
      .in("status", ["trialing", "active"]),
    admin.from("loans").select("id", { count: "exact", head: true }),
    admin.from("customers").select("id", { count: "exact", head: true }),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
  ])

  const { data: paidSubs } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")

  return {
    totalShops: shops.count ?? 0,
    activeShops: subs.count ?? 0,
    // MVP: flat ₹999/month for any active paid subscription.
    mrr: (paidSubs?.length ? paidSubs.length : 0) * STARTER_MRR,
    totalLoans: loans.count ?? 0,
    totalCustomers: customers.count ?? 0,
    leadsThisWeek: leads.count ?? 0,
  }
}

export type AdminActivity = {
  id: string
  entity: string
  entity_id: string
  action: string
  created_at: string
  shop_name: string | null
}

/** Latest audit entries across all shops + newest leads as an activity feed. */
export async function getRecentActivity(): Promise<AdminActivity[]> {
  const { admin } = await requireAdmin()

  const [auditRes, leadsRes] = await Promise.all([
    admin
      .from("audit_log")
      .select("id, entity, entity_id, action, created_at, shops(name)")
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("leads")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  if (auditRes.error) {
    throw new Error(`Failed to load activity: ${auditRes.error.message}`)
  }

  const audit = (auditRes.data ?? []).map((a) => {
    const row = a as unknown as {
      id: string
      entity: string
      entity_id: string
      action: string
      created_at: string
      shops: { name: string } | { name: string }[] | null
    }
    const s = Array.isArray(row.shops) ? row.shops[0] : row.shops
    return {
      id: row.id,
      entity: row.entity,
      entity_id: row.entity_id,
      action: row.action,
      created_at: row.created_at,
      shop_name: s?.name ?? null,
    }
  })

  const leadItems = ((leadsRes.data ?? []) as {
    id: string
    name: string
    created_at: string
  }[]).map((l) => ({
    id: `lead-${l.id}`,
    entity: "lead",
    entity_id: l.id,
    action: `New lead: ${l.name}`,
    created_at: l.created_at,
    shop_name: null,
  }))

  return [...leadItems, ...audit]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 15)
}

export type AdminShopRow = {
  id: string
  name: string
  phone: string
  created_at: string
  shop_plan: string
  trial_ends_at: string | null
  plan: string | null
  subscription_status: string | null
  loan_count: number
  last_activity: string | null
}

export async function listAdminShops(): Promise<AdminShopRow[]> {
  const { admin } = await requireAdmin()

  const { data, error } = await admin
    .from("shops")
    .select(
      "id, name, phone, created_at, plan, trial_ends_at, subscriptions(plan, status), loans(count)"
    )
    // Soonest trial expiry first; nulls (no trial set) last.
    .order("trial_ends_at", { ascending: true, nullsFirst: false })

  if (error) {
    throw new Error(`Failed to load shops: ${error.message}`)
  }

  type ShopRow = {
    id: string
    name: string
    phone: string
    created_at: string
    plan: string
    trial_ends_at: string | null
    subscriptions:
      | { plan: string; status: string }
      | { plan: string; status: string }[]
      | null
    loans: { count: number }[] | null
  }

  // Last activity = most recent loan created per shop (approximation).
  const { data: recentLoans } = await admin
    .from("loans")
    .select("shop_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  const lastActivity = new Map<string, string>()
  for (const l of (recentLoans ?? []) as { shop_id: string; created_at: string }[]) {
    if (!lastActivity.has(l.shop_id)) {
      lastActivity.set(l.shop_id, l.created_at)
    }
  }

  return ((data ?? []) as ShopRow[]).map((s) => {
    const sub = Array.isArray(s.subscriptions)
      ? s.subscriptions[0]
      : s.subscriptions
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      created_at: s.created_at,
      shop_plan: s.plan,
      trial_ends_at: s.trial_ends_at,
      plan: sub?.plan ?? null,
      subscription_status: sub?.status ?? null,
      loan_count: s.loans?.[0]?.count ?? 0,
      last_activity: lastActivity.get(s.id) ?? null,
    }
  })
}

export type AdminShopDetail = {
  id: string
  name: string
  phone: string
  upi_id: string | null
  logo_url: string | null
  interest_mode: string
  grace_days: number
  created_at: string
  plan: string
  trial_ends_at: string | null
  subscription: { plan: string; status: string } | null
  usage: {
    loans_total: number
    loans_active: number
    customers: number
    slabs: number
    staff: number
    payments_total: number
    reminders_sent: number
  }
}

export async function getAdminShop(
  shopId: string
): Promise<AdminShopDetail | null> {
  const { admin } = await requireAdmin()

  const [shopRes, subRes, usage] = await Promise.all([
    admin
      .from("shops")
      .select(
        "id, name, phone, upi_id, logo_url, interest_mode, grace_days, created_at, plan, trial_ends_at"
      )
      .eq("id", shopId)
      .maybeSingle(),
    // Latest subscription row — subscriptions is a ledger, embed order is unreliable.
    admin
      .from("subscriptions")
      .select("plan, status")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    Promise.all([
      admin.from("loans").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
      admin.from("loans").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "active"),
      admin.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
      admin.from("slabs").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
      admin.from("shop_staff").select("user_id", { count: "exact", head: true }).eq("shop_id", shopId),
      admin.from("payments").select("amount").eq("shop_id", shopId),
      admin.from("reminders").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
    ]),
  ])

  if (shopRes.error) {
    throw new Error(`Failed to load shop: ${shopRes.error.message}`)
  }
  if (!shopRes.data) {
    return null
  }

  const s = shopRes.data as {
    id: string
    name: string
    phone: string
    upi_id: string | null
    logo_url: string | null
    interest_mode: string
    grace_days: number
    created_at: string
    plan: string
    trial_ends_at: string | null
  }
  const sub = (subRes.data ?? null) as {
    plan: string
    status: string
  } | null

  const paymentsTotal = ((usage[5].data ?? []) as { amount: number }[]).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )

  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    upi_id: s.upi_id,
    logo_url: s.logo_url,
    interest_mode: s.interest_mode,
    grace_days: s.grace_days,
    created_at: s.created_at,
    plan: s.plan,
    trial_ends_at: s.trial_ends_at,
    subscription: sub,
    usage: {
      loans_total: usage[0].count ?? 0,
      loans_active: usage[1].count ?? 0,
      customers: usage[2].count ?? 0,
      slabs: usage[3].count ?? 0,
      staff: usage[4].count ?? 0,
      payments_total: paymentsTotal,
      reminders_sent: usage[6].count ?? 0,
    },
  }
}

export type AdminSubscriptionRow = {
  id: string
  plan: string
  amount: number | null
  method: string | null
  reference: string | null
  status: string
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
}

/** Last `limit` subscription ledger rows for a shop (newest first). */
export async function getShopSubscriptions(
  shopId: string,
  limit = 10
): Promise<AdminSubscriptionRow[]> {
  const { admin } = await requireAdmin()

  const { data, error } = await admin
    .from("subscriptions")
    .select(
      "id, plan, amount, method, reference, status, current_period_start, current_period_end, created_at"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to load subscriptions: ${error.message}`)
  }

  return ((data ?? []) as AdminSubscriptionRow[]).map((r) => ({
    ...r,
    amount: r.amount === null ? null : Number(r.amount),
  }))
}

export type AdminLead = {
  id: string
  name: string
  shop_name: string | null
  city: string | null
  phone: string
  active_pledges: string | null
  current_method: string | null
  source: string
  status: string
  created_at: string
}

export async function listAdminLeads(): Promise<AdminLead[]> {
  const { admin } = await requireAdmin()

  const { data, error } = await admin
    .from("leads")
    .select(
      "id, name, shop_name, city, phone, active_pledges, current_method, source, status, created_at"
    )
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load leads: ${error.message}`)
  }

  return (data ?? []) as AdminLead[]
}
