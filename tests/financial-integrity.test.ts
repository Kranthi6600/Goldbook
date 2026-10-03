import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Financial-integrity gate for migration 020 + the server-action guards.
 *
 * The server actions under test call `@/lib/supabase/server` → createClient().
 * That module is mocked to return a service-role Supabase client wrapped so
 * auth.getUser() reports the fixture shop's owner. Effects are identical to a
 * real owner session for these tests: the same RPCs, triggers, and guards run.
 *
 * Requires in .env / .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (unused here),
 *   SUPABASE_SERVICE_ROLE_KEY
 */

// Shared state between the test module and the mocked server module.
// Populated at module level (below) — vi.hoisted runs before imports, so it
// cannot itself read files or use imported names.
const boot = vi.hoisted(() => ({ ownerId: "", url: "", key: "" }))

vi.mock("next/cache", () => ({ revalidatePath: () => {} }))

vi.mock("@/lib/supabase/server", async () => {
  const { createClient: makeClient } = await vi.importActual<
    typeof import("@supabase/supabase-js")
  >("@supabase/supabase-js")

  let svc: unknown = null
  function getSvc() {
    if (!svc) {
      svc = makeClient(boot.url, boot.key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    return svc
  }

  return {
    createClient: async () =>
      new Proxy({} as Record<PropertyKey, unknown>, {
        get(_t, p) {
          if (p === "auth") {
            return {
              getUser: async () => ({
                data: {
                  user: boot.ownerId ? { id: boot.ownerId } : null,
                },
                error: null,
              }),
            }
          }
          const target = getSvc() as Record<PropertyKey, unknown>
          const v = Reflect.get(target, p, target)
          return typeof v === "function"
            ? (v as (...a: unknown[]) => unknown).bind(target)
            : v
        },
      }),
  }
})

function loadEnvFile(name: string): Record<string, string> {
  const out: Record<string, string> = {}
  let raw = ""
  try {
    raw = readFileSync(resolve(process.cwd(), name), "utf8")
  } catch {
    return out
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

const env = {
  ...loadEnvFile(".env"),
  ...loadEnvFile(".env.local"),
  ...process.env,
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
boot.url = URL ?? ""
boot.key = KEY ?? ""

const { createLoan } = await import("../lib/actions/loans")
const { recordPayment } = await import("../lib/actions/payments")

const svc: SupabaseClient = URL && KEY
  ? createClient(URL, KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : (null as unknown as SupabaseClient)

// ---- fixtures ---------------------------------------------------------------
let shop: { id: string; owner_id: string; interest_mode: string } | null = null
let customerId = ""
let foreignCustomerId: string | null = null
let slabRate = 0
let tempSlab = false
const createdLoanIds: string[] = []
const createdPaymentIds: string[] = []

function istDate(ts: Date): string {
  return new Date(ts.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)
}

async function makeLoan(over: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await svc
    .from("loans")
    .insert({
      shop_id: shop!.id,
      customer_id: customerId,
      loan_number: `IT-${crypto.randomUUID().slice(0, 8)}`,
      gold_weight_g: 10,
      gold_purity: "22K",
      loan_amount: 50000,
      rate_monthly: 2,
      interest_mode: "simple",
      start_date: new Date().toISOString().slice(0, 10),
      due_date: "2027-01-01",
      status: "active",
      ...over,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(`fixture loan: ${error?.message}`)
  const id = (data as { id: string }).id
  createdLoanIds.push(id)
  return id
}

beforeAll(async () => {
  if (!URL || !KEY) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to run integrity tests."
    )
  }

  const { data: shops } = await svc
    .from("shops")
    .select("id, owner_id, interest_mode")
    .limit(1)
  shop = (shops ?? [])[0] ?? null
  if (!shop) throw new Error("No shop found — run onboarding once first.")
  boot.ownerId = shop.owner_id

  // Fixture customer (owned by the shop) — deleted in afterAll.
  const { data: cust, error: custErr } = await svc
    .from("customers")
    .insert({
      shop_id: shop.id,
      name: "Integrity Test",
      phone: `+9199${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
    })
    .select("id")
    .single()
  if (custErr || !cust) throw new Error(`fixture customer: ${custErr?.message}`)
  customerId = (cust as { id: string }).id

  // Slab covering ₹50,000; create a temp one if the shop has none.
  const { data: rate } = await svc.rpc("get_slab_rate", {
    p_shop_id: shop.id,
    p_loan_amount: 50000,
  })
  if (rate === null || rate === undefined) {
    const { error: slabErr } = await svc.from("slabs").insert({
      shop_id: shop.id,
      min_amount: 1,
      max_amount: 100000,
      rate_monthly: 2,
    })
    if (slabErr) throw new Error(`fixture slab: ${slabErr.message}`)
    tempSlab = true
    slabRate = 2
  } else {
    slabRate = Number(rate)
  }

  // A customer belonging to some OTHER shop, if any exists.
  const { data: foreign } = await svc
    .from("customers")
    .select("id")
    .neq("shop_id", shop.id)
    .limit(1)
  foreignCustomerId = (foreign ?? [])[0]?.id ?? null
})

afterAll(async () => {
  // service_role bypasses the delete guard — full cleanup.
  if (createdPaymentIds.length) {
    await svc.from("payments").delete().in("id", createdPaymentIds)
  }
  if (createdLoanIds.length) {
    await svc.from("loans").delete().in("id", createdLoanIds)
  }
  if (customerId) {
    await svc.from("customers").delete().eq("id", customerId)
  }
  if (tempSlab && shop) {
    await svc
      .from("slabs")
      .delete()
      .eq("shop_id", shop.id)
      .eq("min_amount", 1)
      .eq("max_amount", 100000)
  }
})

// ---- tests ------------------------------------------------------------------
describe("financial integrity", () => {
  it("A: rate_monthly cannot be updated, even via service role", async () => {
    const loanId = await makeLoan()
    const { error } = await svc
      .from("loans")
      .update({ rate_monthly: 0.01 })
      .eq("id", loanId)
    expect(error?.message).toMatch(/immutable/i)
  })

  it("B: a closed loan stops accruing interest at closed_at", async () => {
    const closedAt = new Date(Date.now() - 30 * 24 * 3600_000)
    const loanId = await makeLoan({
      status: "closed",
      closed_at: closedAt.toISOString(),
      start_date: "2026-01-01",
    })

    const { data: rows } = await svc.rpc("loan_summary", { p_loan_id: loanId })
    const summary = (rows ?? [])[0] as { interest_accrued: number }
    const closedIst = istDate(closedAt)

    const { data: frozen } = await svc.rpc("calc_interest", {
      p_loan_amount: 50000,
      p_rate_monthly: 2,
      p_start_date: "2026-01-01",
      p_as_of_date: closedIst,
      p_mode: "simple",
    })
    const { data: today } = await svc.rpc("calc_interest", {
      p_loan_amount: 50000,
      p_rate_monthly: 2,
      p_start_date: "2026-01-01",
      p_as_of_date: istDate(new Date()),
      p_mode: "simple",
    })

    expect(Number(summary.interest_accrued)).toBe(Number(frozen))
    // Guard: today must actually be past the freeze point for this to mean anything.
    expect(Number(today)).toBeGreaterThan(Number(frozen))
  })

  it("C: createLoan ignores a client-supplied rate_monthly", async () => {
    const result = await createLoan({
      customer_id: customerId,
      gold_weight_g: 10,
      gold_purity: "22K",
      loan_amount: 50000,
      rate_monthly: 0.01, // attacker-injected — must be ignored
      start_date: new Date().toISOString().slice(0, 10),
      due_date: "2027-01-01",
      interest_mode: "simple",
    })

    expect(result.error).toBeUndefined()
    expect(result.loanId).toBeTruthy()
    createdLoanIds.push(result.loanId!)

    const { data: loan } = await svc
      .from("loans")
      .select("rate_monthly")
      .eq("id", result.loanId!)
      .single()
    expect(Number((loan as { rate_monthly: number }).rate_monthly)).toBe(slabRate)
  })

  it("D: recordPayment rejects an amount above the balance", async () => {
    const loanId = await makeLoan({ loan_amount: 50000 })
    const result = await recordPayment(loanId, {
      amount: 500000,
      method: "cash",
      kind: "mixed",
      paid_at: new Date().toISOString().slice(0, 10),
    })

    expect(result.error).toMatch(/exceeds/i)
    expect(result.payment).toBeUndefined()

    const { data: payments } = await svc
      .from("payments")
      .select("id")
      .eq("loan_id", loanId)
    createdPaymentIds.push(...(payments ?? []).map((p) => p.id))
    expect(payments?.length ?? 0).toBe(0)
  })

  it("E: createLoan rejects a customer from another shop", async () => {
    const result = await createLoan({
      customer_id: foreignCustomerId ?? crypto.randomUUID(),
      gold_weight_g: 10,
      gold_purity: "22K",
      loan_amount: 50000,
      start_date: new Date().toISOString().slice(0, 10),
      due_date: "2027-01-01",
      interest_mode: "simple",
    })
    expect(result.error).toBe("Customer not found")
    expect(result.loanId).toBeUndefined()
  })
})
