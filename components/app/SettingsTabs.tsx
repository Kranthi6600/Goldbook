"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { label: "General", href: "/settings/general" },
  { label: "Interest Slabs", href: "/settings/slabs" },
  { label: "Staff", href: "/settings/staff" },
  { label: "WhatsApp Templates", href: "/settings/whatsapp" },
  { label: "Security", href: "/settings/security" },
] as const

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
