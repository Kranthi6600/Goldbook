"use server"

import * as React from "react"
import { z } from "zod"
import { pdf, type DocumentProps } from "@react-pdf/renderer"
import { format } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import {
  CustomerStatement,
  type CustomerStatementRow,
} from "@/lib/pdf/CustomerStatement"
import {
  ShopStatement,
  type ShopStatementRow,
} from "@/lib/pdf/ShopStatement"

const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid start date."),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid end date."),
})

type StatementResult = {
  error?: string
  base64?: string
  filename?: string
}

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
    .select("id, name, phone, upi_id")
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
    },
  }
}

async function renderPdf(
  doc: React.ReactElement<DocumentProps>
): Promise<{ base64: string } | { error: string }> {
  try {
    // react-pdf types pdf() as requiring a <Document> element; a custom
    // component rendering <Document> is fine at runtime — cast only.
    const blob = await pdf(doc).toBlob()
    const buf = Buffer.from(await blob.arrayBuffer())
    return { base64: buf.toString("base64") }
  } catch (e) {
    return {
      error: `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

function periodLabel(from: string, to: string): string {
  return `${format(new Date(from), "dd MMM yyyy")} — ${format(
    new Date(to),
    "dd MMM yyyy"
  )}`
}

function coerceRows<T extends Record<string, unknown>>(
  rows: T[] | null
): T[] {
  // Postgres numerics can arrive as strings — coerce money columns to Number.
  return (rows ?? []).map((r) => {
    const out: Record<string, unknown> = { ...r }
    for (const key of Object.keys(out)) {
      if (
        typeof out[key] === "string" &&
        out[key] !== "" &&
        !Number.isNaN(Number(out[key])) &&
        /amount|interest|due|paid|balance|weight/.test(key)
      ) {
        out[key] = Number(out[key])
      }
    }
    return out as T
  })
}

// ---------------------------------------------------------------------------
// generateCustomerStatement — all loans for one customer in the period.
// ---------------------------------------------------------------------------
export async function generateCustomerStatement(
  customerId: string,
  from: string,
  to: string
): Promise<StatementResult> {
  if (!z.uuid().safeParse(customerId).success) {
    return { error: "Invalid customer id." }
  }
  const dates = DateRangeSchema.safeParse({ from, to })
  if (!dates.success) {
    return { error: dates.error.issues[0]?.message ?? "Invalid date range." }
  }
  if (dates.data.from > dates.data.to) {
    return { error: "Start date must be on or before end date." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }
  const { supabase, shopId, shopInfo } = result

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", customerId)
    .eq("shop_id", shopId)
    .maybeSingle()

  if (customerError) {
    return { error: customerError.message }
  }
  if (!customer) {
    return { error: "Customer not found." }
  }

  const { data: rows, error: rpcError } = await supabase.rpc(
    "customer_monthly_statement",
    {
      p_customer_id: customerId,
      p_from: dates.data.from,
      p_to: dates.data.to,
    }
  )
  if (rpcError) {
    return { error: rpcError.message }
  }

  const c = customer as { name: string; phone: string }
  const doc = React.createElement(CustomerStatement, {
    shop: shopInfo,
    customer: { name: c.name, phone: c.phone },
    periodLabel: periodLabel(dates.data.from, dates.data.to),
    rows: coerceRows(
      rows as unknown as CustomerStatementRow[]
    ) as CustomerStatementRow[],
    generatedAt: format(new Date(), "dd MMM yyyy, hh:mm a"),
  }) as React.ReactElement<DocumentProps>

  const rendered = await renderPdf(doc)
  if ("error" in rendered) {
    return { error: rendered.error }
  }
  return {
    base64: rendered.base64,
    filename: `statement-${c.name.replace(/\s+/g, "-").toLowerCase()}-${dates.data.from}.pdf`,
  }
}

// ---------------------------------------------------------------------------
// generateShopStatement — every loan in the period, sorted by due date (SQL).
// ---------------------------------------------------------------------------
export async function generateShopStatement(
  shopId: string,
  from: string,
  to: string
): Promise<StatementResult> {
  const dates = DateRangeSchema.safeParse({ from, to })
  if (!dates.success) {
    return { error: dates.error.issues[0]?.message ?? "Invalid date range." }
  }
  if (dates.data.from > dates.data.to) {
    return { error: "Start date must be on or before end date." }
  }

  const result = await getShopAndUser()
  if ("error" in result) {
    return { error: result.error }
  }
  if (result.shopId !== shopId) {
    return { error: "Invalid shop." }
  }
  const { supabase, shopInfo } = result

  const { data: rows, error: rpcError } = await supabase.rpc(
    "shop_monthly_statement",
    {
      p_shop_id: shopId,
      p_from: dates.data.from,
      p_to: dates.data.to,
    }
  )
  if (rpcError) {
    return { error: rpcError.message }
  }

  const doc = React.createElement(ShopStatement, {
    shop: shopInfo,
    periodLabel: periodLabel(dates.data.from, dates.data.to),
    rows: coerceRows(
      rows as unknown as ShopStatementRow[]
    ) as ShopStatementRow[],
    generatedAt: format(new Date(), "dd MMM yyyy, hh:mm a"),
  }) as React.ReactElement<DocumentProps>

  const rendered = await renderPdf(doc)
  if ("error" in rendered) {
    return { error: rendered.error }
  }
  return {
    base64: rendered.base64,
    filename: `shop-statement-${dates.data.from}.pdf`,
  }
}
