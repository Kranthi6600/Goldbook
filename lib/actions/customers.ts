"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { CustomerSchema } from "@/lib/schemas/customer"
import { searchCustomers, type CustomerSearchResult } from "@/lib/queries/customers"

async function getShopId(): Promise<{ shopId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: shop, error } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!shop) {
    return { error: "Shop not found. Complete onboarding first." }
  }

  return { shopId: (shop as { id: string }).id }
}

const CUSTOMER_SELECT_ERROR =
  "A customer with this phone number already exists."

export async function createCustomer(
  input: unknown
): Promise<{ error?: string; customerId?: string }> {
  const parsed = CustomerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const { shopId, error: shopError } = await getShopId()
  if (!shopId) {
    return { error: shopError }
  }

  const supabase = await createClient()
  const { name, phone, address, id_type, id_number, notes } = parsed.data

  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: shopId,
      name,
      phone,
      address: address || null,
      id_type: id_type || null,
      id_number: id_number || null,
      notes: notes || null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return { error: CUSTOMER_SELECT_ERROR }
    }
    return { error: error.message }
  }

  revalidatePath("/customers")
  return { customerId: (data as { id: string }).id }
}

export async function updateCustomer(
  id: string,
  input: unknown
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) {
    return { error: "Invalid customer id." }
  }

  const parsed = CustomerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const { error: shopError } = await getShopId()
  if (shopError) {
    return { error: shopError }
  }

  const supabase = await createClient()
  const { name, phone, address, id_type, id_number, notes } = parsed.data

  // RLS scopes this to the caller's shop.
  const { data, error } = await supabase
    .from("customers")
    .update({
      name,
      phone,
      address: address || null,
      id_type: id_type || null,
      id_number: id_number || null,
      notes: notes || null,
    })
    .eq("id", id)
    .select("id")

  if (error) {
    if (error.code === "23505") {
      return { error: CUSTOMER_SELECT_ERROR }
    }
    return { error: error.message }
  }
  if (!data || (data as unknown[]).length === 0) {
    return { error: "Customer not found." }
  }

  revalidatePath("/customers")
  revalidatePath(`/customers/${id}`)
  return {}
}
/** Server action for the loan form's customer autocomplete. */
export async function searchCustomersAction(query: string): Promise<{
  results: CustomerSearchResult[]
  error?: string
}> {
  const { shopId, error } = await getShopId()
  if (!shopId) {
    return { results: [], error }
  }
  return { results: await searchCustomers(shopId, query, 10) }
}


export async function deleteCustomer(
  id: string
): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) {
    return { error: "Invalid customer id." }
  }

  const { error: shopError } = await getShopId()
  if (shopError) {
    return { error: shopError }
  }

  const supabase = await createClient()

  const { count, error: countError } = await supabase
    .from("loans")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id)
    .in("status", ["active", "overdue"])

  if (countError) {
    return { error: countError.message }
  }
  if ((count ?? 0) > 0) {
    return { error: "Cannot delete: customer has active loans." }
  }

  const { error } = await supabase.from("customers").delete().eq("id", id)

  if (error) {
    if (error.code === "23503") {
      return { error: "Cannot delete: customer has linked loans." }
    }
    return { error: error.message }
  }

  revalidatePath("/customers")
  return {}
}
