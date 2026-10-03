import type { Metadata } from "next"

import { DemoForm } from "@/components/app/DemoForm"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: `Book a demo — ${BRAND.name}`,
  description: `See ${BRAND.name} running with your own loan numbers in a 15-minute WhatsApp video call.`,
}

export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 lg:flex-row lg:gap-16">
      <div className="max-w-md flex-1">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          See {BRAND.name} with your own numbers.
        </h1>
        <p className="mt-3 text-muted-foreground">
          A 15-minute WhatsApp video call. We'll set up a real shop, enter a
          real loan, and send a real reminder — so you can judge for yourself.
        </p>
        <ul className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
          <li>· 15 minutes, WhatsApp video</li>
          <li>· Your shop, your real loans</li>
          <li>· No credit card, no commitment</li>
        </ul>
      </div>
      <div className="flex-1">
        <DemoForm />
      </div>
    </main>
  )
}
