/**
 * Builds a upi:// deep link for UPI apps (GPay, PhonePe, Paytm).
 * Format: upi://pay?pa=<upi_id>&pn=<payee name>&am=<amount>&tn=<note>
 */
export function buildUpiLink(
  upiId: string,
  payeeName: string,
  amount: number,
  note: string
): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    tn: note,
  })
  if (amount > 0) {
    params.set("am", amount.toFixed(2))
  }
  return `upi://pay?${params.toString()}`
}
