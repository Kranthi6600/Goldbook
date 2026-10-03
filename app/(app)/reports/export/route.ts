import { strToU8, zipSync } from "fflate"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { toCsv } from "@/lib/utils/csv"

/**
 * GET /reports/export
 * One-click compliance export: a ZIP of CSVs for the caller's shop.
 * All data fetches go through the SSR client — RLS scopes everything to the
 * shop the caller belongs to (no shop_id in the URL, nothing to spoof).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Resolve the member's shop: owner first, staff fallback.
  let shop: { id: string; name: string } | null = null

  const { data: owned } = await supabase
    .from("shops")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (owned) {
    shop = owned as { id: string; name: string }
  } else {
    const { data: staff } = await supabase
      .from("shop_staff")
      .select("shop_id, shops(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
    const embedded = staff?.shops as unknown as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null
    const s = Array.isArray(embedded) ? embedded[0] : embedded
    if (s) {
      shop = s
    }
  }

  if (!shop) {
    return NextResponse.json(
      { error: "No shop found for this account." },
      { status: 403 }
    )
  }

  const [loansRes, paymentsRes, customersRes, auditRes] = await Promise.all([
    supabase
      .from("loans")
      .select("*, customers(name, phone)")
      .eq("shop_id", shop.id)
      .order("created_at"),
    supabase
      .from("payments")
      .select("*")
      .eq("shop_id", shop.id)
      .order("paid_at"),
    supabase
      .from("customers")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at"),
    supabase
      .from("audit_log")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ])

  const dbError =
    loansRes.error ?? paymentsRes.error ?? customersRes.error ?? auditRes.error
  if (dbError) {
    return NextResponse.json(
      { error: `Export failed: ${dbError.message}` },
      { status: 500 }
    )
  }

  // Flatten the customer embed so the CSV stays one level deep.
  const loans = (loansRes.data ?? []).map((l) => {
    const row = l as Record<string, unknown> & {
      customers:
        | { name: string; phone: string }
        | { name: string; phone: string }[]
        | null
    }
    const customer = Array.isArray(row.customers)
      ? row.customers[0]
      : row.customers
    const { customers: _customers, ...rest } = row
    return {
      ...rest,
      customer_name: customer?.name ?? "",
      customer_phone: customer?.phone ?? "",
    }
  })

  const zipped = zipSync({
    "loan_register.csv": strToU8(toCsv(loans)),
    "payments.csv": strToU8(toCsv(paymentsRes.data ?? [])),
    "customers.csv": strToU8(toCsv(customersRes.data ?? [])),
    "audit_log.csv": strToU8(toCsv(auditRes.data ?? [])),
  })

  const safeName = shop.name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  const date = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10) // IST
  const filename = `${safeName || "shop"}_export_${date}.zip`

  return new Response(zipped, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipped.length),
      "Cache-Control": "no-store",
    },
  })
}
