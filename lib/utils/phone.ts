/**
 * Normalizes an Indian phone number to the +91XXXXXXXXXX storage format.
 * Accepts inputs like "98765 43210", "+91 98765-43210", "919876543210", "09876543210".
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "")

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2)
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1)
  }

  return `+91${digits}`
}

/** True if the phone is in +91 format followed by exactly 10 digits. */
export function isValidIndianPhone(phone: string): boolean {
  return /^\+91\d{10}$/.test(phone)
}
