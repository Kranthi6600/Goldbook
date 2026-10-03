"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, format } from "date-fns"
import { SearchIcon } from "lucide-react"

import type { AdminShopRow } from "@/lib/queries/admin"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PLAN_STYLES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  trial: { label: "Trial", variant: "secondary" },
  suspended: { label: "Suspended", variant: "destructive" },
}

/** Trial-ends cell: relative days, e.g. "in 13 days" / "expired 2 days ago". */
function trialEndsLabel(trialEndsAt: string | null): {
  text: string
  warn: boolean
  days: number | null
} {
  if (!trialEndsAt) return { text: "—", warn: false, days: null }
  const days = differenceInCalendarDays(new Date(trialEndsAt), new Date())
  if (days < 0) {
    return {
      text: `expired ${-days} day${-days === 1 ? "" : "s"} ago`,
      warn: true,
      days,
    }
  }
  if (days === 0) return { text: "today", warn: true, days }
  return { text: `in ${days} day${days === 1 ? "" : "s"}`, warn: days <= 7, days }
}

export function AdminShopsTable({ shops }: { shops: AdminShopRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [expiringOnly, setExpiringOnly] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shops.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.phone.includes(q)) {
        return false
      }
      if (expiringOnly) {
        const { days } = trialEndsLabel(s.trial_ends_at)
        return days !== null && days >= 0 && days <= 7
      }
      return true
    })
  }, [shops, query, expiringOnly])

  const expiringCount = shops.filter((s) => {
    const { days } = trialEndsLabel(s.trial_ends_at)
    return days !== null && days >= 0 && days <= 7
  }).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-56 pl-8 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setExpiringOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            expiringOnly
              ? "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
              : "border-input text-muted-foreground hover:bg-muted"
          )}
        >
          Trial expiring soon
          {expiringCount > 0 && (
            <Badge variant="destructive" className="px-1.5">
              {expiringCount}
            </Badge>
          )}
        </button>
        {visible.length === 0 && (
          <span className="text-xs text-muted-foreground">
            {query ? `No shops match “${query.trim()}”.` : "No trials expiring in the next 7 days."}
          </span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shop</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Trial ends</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Loans</TableHead>
            <TableHead>Last activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((s) => {
            const trial = trialEndsLabel(s.trial_ends_at)
            const planMeta = PLAN_STYLES[s.shop_plan] ?? {
              label: s.shop_plan,
              variant: "outline" as const,
            }
            return (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/shops/${s.id}`)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.phone}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={planMeta.variant} className="capitalize">
                    {planMeta.label}
                    {s.plan ? ` · ${s.plan.replace(/_/g, " ")}` : ""}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      trial.warn &&
                        "font-medium text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {trial.text}
                  </span>
                </TableCell>
                <TableCell>
                  {format(new Date(s.created_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-right">{s.loan_count}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.last_activity
                    ? format(new Date(s.last_activity), "dd MMM yyyy")
                    : "—"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
