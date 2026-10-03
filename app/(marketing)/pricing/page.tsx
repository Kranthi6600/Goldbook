import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ"
import { FinalCTA } from "@/components/marketing/FinalCTA"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: `Pricing — ${BRAND.name}`,
  description:
    "₹999/month per shop. Optional WhatsApp message pack ₹299–499, one-time onboarding ₹2,000–5,000, payment collection 0.5–1%.",
}

const PRICING = [
  {
    item: "Base plan",
    price: "₹999 / month",
    detail:
      "Everything: loans, customers, interest calculator, WhatsApp reminders, digital passbook, compliance export.",
  },
  {
    item: "WhatsApp message pack",
    price: "₹299–499 / month",
    detail:
      "Optional. Bulk reminder credits if you want high-volume sending beyond the free click-to-chat links.",
  },
  {
    item: "Onboarding & setup",
    price: "₹2,000–5,000 one-time",
    detail:
      "We migrate your existing register, configure your slabs, and train your staff on a video call.",
  },
  {
    item: "Payment collection",
    price: "0.5–1% per txn",
    detail:
      `Optional. If you accept online payments (UPI/cards) through ${BRAND.name}, standard processing applies.`,
  },
] as const

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16">
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          One price. Everything included.
        </h1>
        <p className="mt-3 text-muted-foreground">
          ₹999/month per shop — no per-loan fees, no hidden charges, 14-day free
          trial.
        </p>
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-base font-medium">
          If this software collects even one extra payment per month, it pays
          for itself.
        </p>
      </div>

      <Card size="sm" className="mt-10">
        <CardHeader>
          <CardTitle className="text-base">Price breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">
                  What's included
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PRICING.map((p) => (
                <TableRow key={p.item}>
                  <TableCell className="font-medium">{p.item}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.price}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {p.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ul className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:hidden">
            {PRICING.map((p) => (
              <li key={p.item}>
                <span className="font-medium text-foreground">{p.item}:</span>{" "}
                {p.detail}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 max-w-xl rounded-lg border bg-muted/40 p-4">
        <p className="text-sm font-medium">How it compares</p>
        <p className="mt-1 text-sm text-muted-foreground">
          GoldKhata starts around ₹499/month and CloudHouse around ₹1,999/month.
          {` ${BRAND.name} at ₹999/month`} includes the borrower passbook,
          WhatsApp reminders, and compliance export — not just a ledger. The
          cheapest ledger still leaves you calling every borrower by hand.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
        <Button size="lg" render={<Link href="/demo" />}>
          Start free trial
        </Button>
        <Button
          size="lg"
          variant="outline"
          render={<Link href="/demo" />}
        >
          Book a demo first
        </Button>
      </div>

      <div className="mt-16">
        <MarketingFAQ />
      </div>
      <FinalCTA />
    </main>
  )
}
