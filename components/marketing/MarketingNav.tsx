import Link from "next/link"

import { BRAND } from "@/lib/brand"

const LINKS = [
  { label: "Product", href: "/landing#product" },
  { label: "How it works", href: "/landing#how-it-works" },
  { label: "Pricing", href: "/pricing" },
] as const

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/landing" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {BRAND.name[0]}
          </span>
          {BRAND.name}
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Login
          </Link>
          <Link
            href="/demo"
            className="ml-1 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Book Demo
          </Link>
        </div>
      </nav>
    </header>
  )
}
