import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeftIcon, FileTextIcon } from "lucide-react"

import { getCurrentShop } from "@/lib/queries/shops"
import { getCustomer } from "@/lib/queries/customers"
import { formatINR } from "@/lib/utils/money"
import { ID_TYPES } from "@/lib/schemas/customer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const STATUS_VARIANT: Record<
  string,
  "secondary" | "destructive" | "outline" | "ghost"
> = {
  active: "secondary",
  overdue: "destructive",
  closed: "outline",
  auctioned: "ghost",
  written_off: "ghost",
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const { customer, loans, stats } = await getCustomer(shop.id, id)
  if (!customer) {
    notFound()
  }

  const idTypeLabel = ID_TYPES.find((t) => t.value === customer.id_type)?.label

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/customers"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/reports/statement?customer=${customer.id}`}
            />
          }
        >
          <FileTextIcon />
          Download Statement
        </Button>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {customer.address && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right">{customer.address}</span>
            </div>
          )}
          {idTypeLabel && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{idTypeLabel}</span>
              <span>{customer.id_number}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Active loans</span>
            <span>{stats.activeLoanCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-medium">
              {formatINR(stats.outstanding)}
            </span>
          </div>
          {customer.notes && (
            <>
              <Separator />
              <p className="text-muted-foreground">{customer.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Loans</h2>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No loans for this customer yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {loans.map((loan) => (
              <Card key={loan.id} size="sm">
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      #{loan.loan_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatINR(loan.loan_amount)} · {loan.rate_monthly}%/mo ·{" "}
                      {loan.gold_weight_g}g
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={STATUS_VARIANT[loan.status] ?? "outline"}>
                      {loan.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Due {format(new Date(loan.due_date), "dd MMM yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
