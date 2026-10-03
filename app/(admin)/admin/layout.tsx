import Link from "next/link"
import type { ReactNode } from "react"

import { requireAdmin } from "@/lib/queries/admin"
import { BRAND } from "@/lib/brand"

const NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Shops", href: "/admin/shops" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Support", href: "/admin/support" },
  { label: "Announcements", href: "/admin/announcements" },
] as const

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAdmin()

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 shrink-0 border-r bg-muted/30">
        <div className="border-b px-4 py-4">
          <Link href="/admin" className="text-sm font-semibold">
            {BRAND.name}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              Admin
            </span>
          </Link>
        </div>
        <nav className="flex flex-col p-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
