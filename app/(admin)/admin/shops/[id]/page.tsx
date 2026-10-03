import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeftIcon, EyeIcon, TriangleAlertIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getAdminShop, getShopSubscriptions } from "@/lib/queries/admin"
import { formatINR } from "@/lib/utils/money"
import { MarkPaidDialog } from "@/components/admin/MarkPaidDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/app/StatCard"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

export default async function AdminShopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const [shop, subs, isDbAdmin] = await Promise.all([
    getAdminShop(id),
    getShopSubscriptions(id),
    // Button visibility mirrors the RPC gate: DB admins table, not env list.
    createClient().then((c) => c.rpc("is_admin")),
  ])
  if (!shop) {
    notFound()
  }
  const canMarkPaid = isDbAdmin.data === true

  const viewAsShop = sp.view === "shop"

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/shops"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to shops
      </Link>

      {viewAsShop && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          Viewing as shop (read-only) — what this shop sees is shown below.
          This is not full impersonation.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{shop.name}</h1>
          {shop.subscription && (
            <Badge variant="secondary" className="capitalize">
              {shop.subscription.plan} · {shop.subscription.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {canMarkPaid && (
            <MarkPaidDialog
              shop={{
                id: shop.id,
                name: shop.name,
                plan: shop.plan,
                trial_ends_at: shop.trial_ends_at,
              }}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/shops/${shop.id}?view=shop`} />}
          >
            <EyeIcon />
            View as shop
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Loans" value={String(shop.usage.loans_total)} />
        <StatCard label="Active" value={String(shop.usage.loans_active)} />
        <StatCard label="Customers" value={String(shop.usage.customers)} />
        <StatCard label="Slabs" value={String(shop.usage.slabs)} />
        <StatCard label="Staff" value={String(shop.usage.staff)} />
        <StatCard
          label="Collected"
          value={formatINR(shop.usage.payments_total)}
        />
        <StatCard
          label="Reminders"
          value={String(shop.usage.reminders_sent)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">Shop config</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Row label="Phone" value={shop.phone} />
            <Row label="UPI" value={shop.upi_id ?? "—"} />
            <Row label="Interest mode" value={shop.interest_mode} />
            <Row label="Grace days" value={String(shop.grace_days)} />
            <Row
              label="Trial ends"
              value={
                shop.trial_ends_at
                  ? format(new Date(shop.trial_ends_at), "dd MMM yyyy")
                  : "—"
              }
            />
            <Row
              label="Joined"
              value={format(new Date(shop.created_at), "dd MMM yyyy")}
            />
          </CardContent>
        </Card>
      </div>

      {/* Subscription history */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Subscription history</CardTitle>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subscription records yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Period end</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      {format(new Date(sub.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {sub.plan.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-right">
                      {sub.amount === null ? "—" : formatINR(sub.amount)}
                    </TableCell>
                    <TableCell className="uppercase">
                      {sub.method ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.reference ?? "—"}
                    </TableCell>
                    <TableCell>
                      {sub.current_period_end
                        ? format(
                            new Date(sub.current_period_end),
                            "dd MMM yyyy"
                          )
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card size="sm" className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TriangleAlertIcon className="size-4 text-destructive" />
            <CardTitle className="text-base">Danger zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <span title="Not implemented">
            <Button variant="destructive" size="sm" disabled>
              Suspend shop
            </Button>
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
