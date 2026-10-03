import Link from "next/link"

import { BRAND } from "@/lib/brand"

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium text-foreground">{BRAND.name}</span> — gold
          loan software for Indian pawnbrokers.
        </p>
        <div className="flex gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/demo" className="hover:text-foreground">
            Demo
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Login
          </Link>
        </div>
      </div>
    </footer>
  )
}
