/**
 * Single source of truth for brand strings.
 *
 * EVERY user-facing "GoldBook" renders from BRAND.name — renaming the product
 * is a one-line change here. Never hardcode the name in copy, metadata, or
 * WhatsApp messages.
 */
export const BRAND = {
  name: "GoldBook",
  tagline: "Gold loan software for Indian pawnbrokers",
  salesWhatsapp: process.env.NEXT_PUBLIC_SALES_WHATSAPP!,
  supportEmail: "support@goldbook.app",
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
} as const
