import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const INCLUDED = [
  "Unlimited loans & customers",
  "Automatic interest calculation",
  "WhatsApp reminders & receipts",
  "Digital passbook for borrowers",
  "Compliance export (CSV/ZIP)",
  "14-day free trial",
] as const

export function PricingPreview() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Simple pricing, no surprises.
        </h2>
        <div>
          <p className="text-5xl font-bold tracking-tight">₹999</p>
          <p className="mt-1 text-sm text-muted-foreground">
            per shop / month · optional WhatsApp message pack ₹299–499
          </p>
        </div>
        <ul className="grid w-full max-w-md gap-2 text-left text-sm sm:grid-cols-2">
          {INCLUDED.map((i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckIcon className="size-4 shrink-0 text-primary" />
              {i}
            </li>
          ))}
        </ul>
        <Button variant="outline" render={<Link href="/pricing" />}>
          See full pricing
        </Button>
      </div>
    </section>
  )
}
