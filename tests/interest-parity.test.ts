import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

import { calcInterestPreview } from "../lib/utils/interest-preview"

/**
 * Parity gate: JS preview mirror vs SQL calc_interest (source of truth).
 *
 * Generates 200 pseudo-random cases (seeded — deterministic per run) and
 * asserts SQL and JS agree to whole rupees. Any mismatch prints exact inputs.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env
 * or .env.local (parsed directly — no dotenv dependency).
 */

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
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const CASES = 200
const CONCURRENCY = 20

/** Deterministic PRNG so failures reproduce exactly. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Case = {
  amount: number
  rate: number
  days: number
  mode: "simple" | "compound"
}

function genCases(n: number): Case[] {
  const rng = mulberry32(0x9e3779b9)
  const cases: Case[] = []
  for (let i = 0; i < n; i++) {
    cases.push({
      amount: Math.round(100 + rng() * (10_00_000 - 100)),
      rate: Math.round((0.5 + rng() * 2.5) * 100) / 100,
      days: Math.round(rng() * 730),
      mode: rng() < 0.5 ? "simple" : "compound",
    })
  }
  return cases
}

function addDaysISO(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

describe("interest parity: SQL calc_interest vs JS calcInterestPreview", () => {
  it("200 random cases match to whole rupees", async () => {
    if (!URL || !ANON) {
      throw new Error(
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env to run parity tests."
      )
    }
    const supabase = createClient(URL, ANON)
    const cases = genCases(CASES)
    const START = "2026-01-01"

    const failures: string[] = []

    for (let i = 0; i < cases.length; i += CONCURRENCY) {
      const batch = cases.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map(async (c, j) => {
          const idx = i + j
          const asOf = addDaysISO(START, c.days)
          const { data, error } = await supabase.rpc("calc_interest", {
            p_loan_amount: c.amount,
            p_rate_monthly: c.rate,
            p_start_date: START,
            p_as_of_date: asOf,
            p_mode: c.mode,
          })
          if (error) {
            failures.push(`#${idx} RPC error: ${error.message} inputs=${JSON.stringify(c)}`)
            return
          }
          const sql = Math.round(Number(data))
          const js = calcInterestPreview(
            c.amount,
            c.rate,
            START,
            asOf,
            c.mode
          )
          if (sql !== js) {
            failures.push(
              `#${idx} MISMATCH sql=${sql} js=${js} inputs=${JSON.stringify(c)}`
            )
          }
        })
      )
    }

    expect(failures, failures.join("\n")).toEqual([])
  }, 120_000)
})
