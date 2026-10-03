"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"

import { createClient } from "@/lib/supabase/server"
import { LoanCreateSchema } from "@/lib/schemas/loan"

const PASSBOOK_TOKEN_DAYS = 365

async function getOwnedShop() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." as const }
  }

  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, interest_mode")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!shop) {
    return { error: "Shop not found. Complete onboarding first." }
  }

  return { supabase, shop: shop as { id: string; interest_mode: string } }
}

/** Slab rate lookup for the loan form's rate autofill. */
export async function getSlabRateAction(
  amount: number
): Promise<{ rate?: number; error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {}
  }

  const result = await getOwnedShop()
  if ("error" in result) {
    return { error: result.error }
  }

  const { data, error } = await result.supabase
    .from("slabs")
    .select("rate_monthly")
    .eq("shop_id", result.shop.id)
    .lte("min_amount", amount)
    .gte("max_amount", amount)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  return { rate: data ? Number((data as { rate_monthly: number }).rate_monthly) : undefined }
}

export async function createLoan(input: unknown): Promise<{
  error?: string
  loanId?: string
  loanNumber?: string
  customerId?: string
  passbookToken?: string
}> {
  const parsed = LoanCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const result = await getOwnedShop()
  if ("error" in result) {
    return { error: result.error }
  }
  const { supabase, shop } = result
  const v = parsed.data

  // a) Resolve customer: existing id OR create a new customer first.
  let customerId = v.customer_id || null

  // Existing customer: verify they belong to THIS shop — never trust the id.
  if (customerId) {
    const { data: cust, error: custError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("shop_id", shop.id)
      .maybeSingle()

    if (custError) {
      return { error: custError.message }
    }
    if (!cust) {
      return { error: "Customer not found" }
    }
  }

  if (!customerId && v.new_customer) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        shop_id: shop.id,
        name: v.new_customer.name,
        phone: v.new_customer.phone,
      })
      .select("id")
      .single()

    if (customerError) {
      if (customerError.code === "23505") {
        return {
          error:
            "A customer with this phone number already exists. Select them under 'Existing customer'.",
        }
      }
      return { error: customerError.message }
    }
    customerId = (customer as { id: string }).id
  }

  if (!customerId) {
    return { error: "Select an existing customer or enter a new one." }
  }

  // b) Rate comes from the shop's slab table — never from the client.
  const { data: slabRate, error: rateError } = await supabase.rpc(
    "get_slab_rate",
    { p_shop_id: shop.id, p_loan_amount: v.loan_amount }
  )
  if (rateError) {
    return { error: rateError.message }
  }
  if (slabRate === null || slabRate === undefined) {
    return { error: "No interest slab configured for this amount" }
  }

  // c) Server-side loan number: GL-YYYY-NNNN per shop (migration 005).
  const { data: loanNumber, error: numberError } = await supabase.rpc(
    "get_next_loan_number",
    { p_shop_id: shop.id }
  )
  if (numberError || !loanNumber) {
    return {
      error: numberError?.message ?? "Failed to generate loan number.",
    }
  }

  // d) Insert loan — rate_monthly + interest_mode frozen on the row.
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      shop_id: shop.id,
      customer_id: customerId,
      loan_number: loanNumber as string,
      gold_weight_g: v.gold_weight_g,
      gold_purity: v.gold_purity,
      gold_description: v.gold_description || null,
      loan_amount: v.loan_amount,
      rate_monthly: Number(slabRate),
      interest_mode: v.interest_mode ?? shop.interest_mode,
      start_date: v.start_date,
      due_date: v.due_date,
      status: "active",
    })
    .select("id")
    .single()

  if (loanError || !loan) {
    return { error: loanError?.message ?? "Failed to create loan." }
  }

  // d) Reuse an active passbook token, else mint one (member policy, migration 005).
  let passbookToken: string | undefined

  const { data: existingToken } = await supabase
    .from("passbook_tokens")
    .select("token")
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (existingToken) {
    passbookToken = (existingToken as { token: string }).token
  } else {
    const token = randomUUID()
    const expiresAt = new Date(
      Date.now() + PASSBOOK_TOKEN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const { error: tokenError } = await supabase
      .from("passbook_tokens")
      .insert({
        token,
        shop_id: shop.id,
        customer_id: customerId,
        expires_at: expiresAt,
      })

    if (tokenError) {
      // Loan was created; token failure shouldn't fail the whole request.
      return {
        loanId: (loan as { id: string }).id,
        loanNumber: loanNumber as string,
        customerId,
        error: `Loan created, but passbook link failed: ${tokenError.message}`,
      }
    }
    passbookToken = token
  }

  revalidatePath("/")
  revalidatePath("/loans")
  revalidatePath("/customers")

  return {
    loanId: (loan as { id: string }).id,
    loanNumber: loanNumber as string,
    customerId,
    passbookToken,
  }
}
