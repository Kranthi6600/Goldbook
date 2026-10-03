import type { Metadata } from "next"

import { Hero } from "@/components/marketing/Hero"
import { PainPoints } from "@/components/marketing/PainPoints"
import { Solution } from "@/components/marketing/Solution"
import { HowItWorks } from "@/components/marketing/HowItWorks"
import { ROICallout } from "@/components/marketing/ROICallout"
import { PricingPreview } from "@/components/marketing/PricingPreview"
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ"
import { FinalCTA } from "@/components/marketing/FinalCTA"
import { Badge } from "@/components/ui/badge"
import { LocalSEOSection } from "@/components/marketing/LocalSEOSection"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Track gold loans, calculate interest automatically, and remind borrowers on WhatsApp. Built for RBI 2025 record-keeping. ₹999/month.",
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Every pledge, every paisa — accounted for. Loans, interest, and WhatsApp reminders in your pocket.",
    type: "website",
  },
}

function TrustStrip() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/40 px-5 py-6 text-center">
        <Badge variant="secondary">Compliance-first</Badge>
        <p className="max-w-lg text-sm text-muted-foreground">
          Built for RBI 2025 record-keeping standards — frozen interest rates,
          complete audit trail, and a one-click export of your full register.
        </p>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <PainPoints />
      <Solution />
      <HowItWorks />
      <ROICallout />
      <PricingPreview />
      <TrustStrip />
      <LocalSEOSection />
      <MarketingFAQ />
      <FinalCTA />
    </main>
  )
}
