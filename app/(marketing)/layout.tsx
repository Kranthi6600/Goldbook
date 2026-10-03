import type { ReactNode } from "react"

import { MarketingNav } from "@/components/marketing/MarketingNav"
import { Footer } from "@/components/marketing/Footer"
import { WhatsAppFab } from "@/components/marketing/WhatsAppFab"

export default function MarketingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <MarketingNav />
      {children}
      <Footer />
      <WhatsAppFab />
    </>
  )
}
