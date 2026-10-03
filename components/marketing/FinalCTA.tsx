import Link from "next/link"

import { Button } from "@/components/ui/button"
import { BRAND } from "@/lib/brand"

export function FinalCTA() {
  return (
    <section className="border-t bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          See your register running on {BRAND.name}.
        </h2>
        <p className="max-w-md text-sm text-primary-foreground/80">
          A 15-minute demo on WhatsApp video call. We'll set up your shop, enter
          a real loan, and send a real reminder — so you can judge for yourself.
        </p>
        <Button
          size="lg"
          variant="secondary"
          render={<Link href="/demo" />}
        >
          Book a free demo
        </Button>
      </div>
    </section>
  )
}
