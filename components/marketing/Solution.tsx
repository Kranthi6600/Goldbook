import {
  CalculatorIcon,
  MessageCircleIcon,
  BookOpenIcon,
} from "lucide-react"

import { BRAND } from "@/lib/brand"

const FEATURES = [
  {
    icon: CalculatorIcon,
    title: "Interest Calculator",
    detail:
      "Simple or compound interest computed to the day, exactly the way your shop works. Rates are frozen on every loan — no drift, no disputes.",
  },
  {
    icon: MessageCircleIcon,
    title: "WhatsApp Reminders",
    detail:
      "One tap sends a polite reminder with the borrower's exact balance and a payment link. No apps to install — it opens WhatsApp directly.",
  },
  {
    icon: BookOpenIcon,
    title: "Digital Ledger",
    detail:
      "Loans, payments, and balances in one searchable register — on your phone. Export a full audit-ready CSV anytime.",
  },
] as const

export function Solution() {
  return (
    <section id="product" className="mx-auto w-full max-w-5xl px-4 py-16">
      <h2 className="text-2xl font-semibold sm:text-3xl">
        Built for the counter, not the back office.
      </h2>
      <p className="mt-2 text-muted-foreground">
        Three things {BRAND.name} does well — and nothing you don't need.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border p-5">
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2">
              <f.icon className="size-5 text-primary" />
            </div>
            <h3 className="font-medium">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
