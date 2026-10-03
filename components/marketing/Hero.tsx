import Link from "next/link"
import { MessageCircleIcon } from "lucide-react"

import { BRAND } from "@/lib/brand"
import { salesWaLink } from "@/lib/utils/whatsapp"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
      <p className="rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
        Gold loan software for Indian pawnshops
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Every pledge, every paisa —{" "}
        <span className="text-primary">accounted for.</span>
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Gold loan software that gives your customers a digital passbook on
        WhatsApp — automatic interest calculation, due reminders, and payment
        history. You collect faster and look more trustworthy than the shop
        across the street.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" render={<Link href="/demo" />}>
          Book a free demo
        </Button>
        <Button
          size="lg"
          variant="outline"
          render={
            <a
              href={salesWaLink(`Hi, I want to know more about ${BRAND.name}`)}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <MessageCircleIcon />
          WhatsApp us
        </Button>
      </div>
    </section>
  )
}
