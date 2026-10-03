import Link from "next/link"
import {
  BellIcon,
  DownloadIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ACTIONS = [
  { label: "New Loan", href: "/loans/new", icon: PlusIcon },
  { label: "Search Customer", href: "/customers", icon: SearchIcon },
  { label: "Send Reminders", href: "/reminders", icon: BellIcon },
  { label: "Export", href: "/reports", icon: DownloadIcon },
] as const

export function QuickActions({
  pendingReminders = 0,
}: {
  pendingReminders?: number
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ label, href, icon: Icon }) => (
        <Button
          key={label}
          variant="outline"
          size="lg"
          className="w-full"
          render={<Link href={href} />}
        >
          <Icon />
          {label}
          {label === "Send Reminders" && pendingReminders > 0 && (
            <Badge variant="destructive">{pendingReminders}</Badge>
          )}
        </Button>
      ))}
    </div>
  )
}
