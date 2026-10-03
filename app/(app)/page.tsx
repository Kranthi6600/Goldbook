import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRightIcon, CoinsIcon } from "lucide-react"

import { getCurrentShop } from "@/lib/queries/shops"
import { getDashboardStats } from "@/lib/queries/dashboard"
import { listLoans } from "@/lib/queries/loans"
import { formatINR } from "@/lib/utils/money"
import { StatCard } from "@/components/app/StatCard"
import { QuickActions } from "@/components/app/QuickActions"
import { EmptyState } from "@/components/app/EmptyState"
import { ActiveLoansTable } from "@/components/app/ActiveLoansTable"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function DashboardPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const [stats, { loans }] = await Promise.all([
    getDashboardStats(shop.id),
    // Open loans only — active + overdue, sorted newest first.
    listLoans(shop.id, { status: "all" }, 1, 50),
  ])

  const openLoans = loans.filter(
    (l) => l.status === "active" || l.status === "overdue"
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total outstanding"
          value={formatINR(stats.totalOutstanding)}
          hint="Principal + accrued interest − paid"
        />
        <StatCard
          label="Overdue loans"
          value={String(stats.overdueCount)}
          variant={stats.overdueCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Overdue amount"
          value={formatINR(stats.overdueAmount)}
          variant={stats.overdueAmount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Today's collections"
          value={formatINR(stats.todayCollections)}
          variant={stats.todayCollections > 0 ? "success" : "default"}
        />
        <StatCard
          label="Gold in custody"
          value={`${stats.goldInCustodyG} g`}
        />
        <StatCard
          label="Pending reminders"
          value={String(stats.pendingReminders)}
          hint="Due ≤3 days, no reminder sent"
          variant={stats.pendingReminders > 0 ? "warning" : "default"}
        />
      </div>

      {stats.loanCount === 0 && (
        <EmptyState
          icon={CoinsIcon}
          title="No loans yet"
          description="Create your first gold loan to start tracking interest, payments, and reminders."
          action={{ label: "New loan", href: "/loans/new" }}
        />
      )}

      {openLoans.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active loans</CardTitle>
              <Link
                href="/loans"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ActiveLoansTable loans={openLoans} />
          </CardContent>
        </Card>
      )}

      <QuickActions pendingReminders={stats.pendingReminders} />
    </div>
  )
}
