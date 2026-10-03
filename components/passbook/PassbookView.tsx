import { format } from "date-fns"
import { ChevronDownIcon, IndianRupeeIcon } from "lucide-react"

import type { PassbookData, PassbookLoan } from "@/lib/queries/passbook"
import { formatINR } from "@/lib/utils/money"
import { BRAND } from "@/lib/brand"
import { buildUpiLink } from "@/lib/utils/upi"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function LoanCard({ loan, shop }: { loan: PassbookLoan; shop: PassbookData["shop"] }) {
  const isOpen = loan.status === "active" || loan.status === "overdue"
  const upiLink =
    isOpen && shop.upi_id && loan.summary.balance > 0
      ? buildUpiLink(
          shop.upi_id,
          shop.name,
          loan.summary.balance,
          `Loan ${loan.loan_number}`
        )
      : null

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{loan.loan_number}</CardTitle>
          <Badge variant={STATUS_VARIANT[loan.status] ?? "outline"} className={cn("capitalize")}>
            {loan.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Row
            label="Gold"
            value={`${loan.gold_weight_g}g ${loan.gold_purity ?? ""}`.trim()}
          />
          {loan.gold_description && (
            <p className="text-xs text-muted-foreground">
              {loan.gold_description}
            </p>
          )}
          <Row label="Loan amount" value={formatINR(loan.loan_amount)} />
          <Row
            label="Interest rate"
            value={`${loan.rate_monthly}%/month (${loan.interest_mode})`}
          />
          <Row
            label="Period"
            value={`${format(new Date(loan.start_date), "dd MMM yyyy")} → ${format(new Date(loan.due_date), "dd MMM yyyy")}`}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <Row
            label="Interest accrued"
            value={formatINR(loan.summary.interest_accrued)}
          />
          <Row label="Total due" value={formatINR(loan.summary.total_due)} />
          <Row label="Paid" value={formatINR(loan.summary.total_paid)} />
          <div className="flex justify-between gap-4 text-sm font-medium">
            <span>Balance</span>
            <span className={loan.summary.balance > 0 && loan.status === "overdue" ? "text-destructive" : undefined}>
              {formatINR(loan.summary.balance)}
            </span>
          </div>
        </div>

        {upiLink && (
          <Button render={<a href={upiLink} />} className="w-full">
            <IndianRupeeIcon />
            Pay {formatINR(loan.summary.balance)} via UPI
          </Button>
        )}

        {loan.payments.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
              <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
              Payment history ({loan.payments.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5 border-l pl-3">
              {loan.payments.map((p, i) => (
                <li
                  key={i}
                  className="flex justify-between text-xs text-muted-foreground"
                >
                  <span>
                    {format(new Date(p.paid_at), "dd MMM yyyy")} · {p.method}
                    {p.kind !== "mixed" ? ` · ${p.kind}` : ""}
                  </span>
                  <span>{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

export function PassbookView({ data }: { data: PassbookData }) {
  const { shop, customer, loans } = data

  return (
    <main className="min-h-screen bg-muted/40">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-10">
        {/* Shop header */}
        <div className="flex items-center gap-3 pt-4">
          {shop.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.logo_url}
              alt=""
              className="size-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
              {shop.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold leading-tight">{shop.name}</h1>
            {shop.phone && (
              <p className="text-xs text-muted-foreground">{shop.phone}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Digital passbook for{" "}
          <span className="font-medium text-foreground">{customer.name}</span>
        </p>

        {loans.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <p className="py-6 text-center text-sm text-muted-foreground">
                No loans found.
              </p>
            </CardContent>
          </Card>
        ) : (
          loans.map((loan) => (
            <LoanCard key={loan.loan_number} loan={loan} shop={shop} />
          ))
        )}

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Powered by {BRAND.name}
        </p>
      </div>
    </main>
  )
}
