// PREVIEW ONLY. This mirrors SQL calc_interest for instant form feedback.
//  NEVER use this for persisted values, displayed balances, or WhatsApp messages.
//  All persisted/displayed numbers MUST come from SQL via loan_summary RPC.
//  If you change SQL calc_interest, you MUST update this file AND run
//  tests/interest-parity.test.ts to verify parity.
//
// simple:   round(P × r/100 × days/30)
// compound: round(P × ((1 + r/100)^(days/30) − 1))

/** Date-only difference in whole days — matches Postgres `date - date`. */
function toUtcDay(d: string | Date): number {
  if (typeof d === "string") {
    const [y, m, day] = d.slice(0, 10).split("-").map(Number)
    return Date.UTC(y, m - 1, day)
  }
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

export function calcInterestPreview(
  principal: number,
  rateMonthly: number,
  startDate: string | Date,
  asOfDate: string | Date,
  mode: "simple" | "compound"
): number {
  const days = Math.round((toUtcDay(asOfDate) - toUtcDay(startDate)) / 86400000)

  if (!Number.isFinite(days) || days <= 0 || principal <= 0) {
    return 0
  }

  const r = rateMonthly / 100
  const periods = days / 30

  if (mode === "simple") {
    return Math.round(principal * r * periods)
  }
  return Math.round(principal * (Math.pow(1 + r, periods) - 1))
}
