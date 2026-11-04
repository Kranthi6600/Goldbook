import Link from "next/link"
import type { ReactNode } from "react"

import { requireAdmin } from "@/lib/queries/admin"
import { BRAND } from "@/lib/brand"
import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-48 shrink-0 flex-col border-r bg-muted/30">
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

      {/* Mobile Header */}
      <div className="md:hidden flex w-full flex-col">
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="text-sm font-semibold">
              {BRAND.name} Admin
            </Link>
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                <MenuIcon />
                <span className="sr-only">Open menu</span>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>{BRAND.name} Admin</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-4">
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
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>

      {/* Desktop Main Content */}
      <main className="hidden md:block flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
