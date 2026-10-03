import { format } from "date-fns"
import { formatINR } from "@/lib/utils/money"

import { getAdminStats, getRecentActivity } from "@/lib/queries/admin"
import { StatCard } from "@/components/app/StatCard"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function AdminOverviewPage() {
  const [stats, activity] = await Promise.all([
    getAdminStats(),
    getRecentActivity(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total shops" value={String(stats.totalShops)} />
        <StatCard
          label="Active subs"
          value={String(stats.activeShops)}
          hint="trialing + active"
        />
        <StatCard
          label="MRR"
          value={formatINR(stats.mrr)}
          hint="active × ₹999"
        />
        <StatCard label="Loans" value={String(stats.totalLoans)} />
        <StatCard label="Customers" value={String(stats.totalCustomers)} />
        <StatCard
          label="Leads (7d)"
          value={String(stats.leadsThisWeek)}
        />
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="truncate">
                    <span className="capitalize">{a.action}</span>
                    {a.shop_name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {a.shop_name}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "dd MMM, hh:mm a")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
