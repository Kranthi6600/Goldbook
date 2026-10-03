/**
 * Admin allowlist check. ADMIN_EMAILS is a comma-separated env var.
 * Safe to call from middleware (edge) and server code — no client secrets
 * beyond the allowlist itself.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = process.env.ADMIN_EMAILS ?? ""
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
