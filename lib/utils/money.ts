const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

/** Formats a numeric amount as INR, e.g. 50000 -> "₹50,000". */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount)
}

/** Parses a display amount back to a number by stripping commas. */
export function parseAmount(input: string): number {
  return Number(input.replace(/,/g, ""))
}
