import { BRAND } from "@/lib/brand"
import { renderTemplate } from "@/lib/utils/template"

/** Sales/inbound WhatsApp number — set NEXT_PUBLIC_SALES_WHATSAPP in env. */
export const SALES_WA_NUMBER = BRAND.salesWhatsapp || "919999999999"

export function salesWaLink(message: string): string {
  return waLink(SALES_WA_NUMBER, message)
}

/** Absolute passbook URL for WhatsApp messages. */
export function passbookUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "")
  return `${base}/p/${token}`
}

/** wa.me click-to-chat link. Phone is stripped to digits (+91 → 91...). */
export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "")
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

// ---------------------------------------------------------------------------
// Message builders — thin named wrappers over renderTemplate.
// The actual message TEXT lives in shops.whatsapp_templates (per-shop
// editable in Settings → WhatsApp). Builders exist so call sites stay explicit
// about which template they need and which vars they supply.
// ---------------------------------------------------------------------------

export function buildReceiptMessage(
  template: string,
  vars: Record<string, string>
): string {
  return renderTemplate(template, vars)
}

export function buildReminderMessage(
  template: string,
  vars: Record<string, string>
): string {
  return renderTemplate(template, vars)
}

export function buildPaymentMessage(
  template: string,
  vars: Record<string, string>
): string {
  return renderTemplate(template, vars)
}
