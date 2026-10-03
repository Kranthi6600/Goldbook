import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeftIcon, HandCoinsIcon } from "lucide-react"

import { getCurrentShop, getShopSettings } from "@/lib/queries/shops"
import { getLoan } from "@/lib/queries/loans"
import { PaymentDialog } from "@/components/app/PaymentDialog"
import { CloseLoanDialog } from "@/components/app/loan-detail/CloseLoanDialog"
import { EditDueDateDialog } from "@/components/app/loan-detail/EditDueDateDialog"
import { RevokePassbookDialog } from "@/components/app/loan-detail/RevokePassbookDialog"
import { SendReminderButton } from "@/components/app/loan-detail/SendReminderButton"
import { SendStatementButton } from "@/components/app/loan-detail/SendStatementButton"
import { formatINR } from "@/lib/utils/money"
import { mergeWithDefaults } from "@/lib/utils/template"
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
import { StatCard } from "@/components/app/StatCard"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const [{ loan, payments, summary, audit }, settings] = await Promise.all([
    getLoan(shop.id, id),
    getShopSettings(shop.id),
  ])
  if (!loan) {
    notFound()
  }

  const balance = Number(summary?.balance ?? 0)
  const canPay = loan.status === "active" || loan.status === "overdue"
  // Interest still owed = accrued minus what was already paid as interest.
  const interestPaid = payments
    .filter((p) => p.kind === "interest")
    .reduce((s, p) => s + Number(p.amount), 0)
  const interestOutstanding = Math.max(
    0,
    Number(summary?.interest_accrued ?? 0) - interestPaid
  )

  const statusVariant =
    loan.status === "overdue"
      ? "destructive"
      : loan.status === "active"
        ? "secondary"
        : "outline"

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/loans"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to loans
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{loan.loan_number}</h1>
          <Badge variant={statusVariant} className={cn("capitalize")}>
            {loan.status.replace("_", " ")}
          </Badge>
        </div>
        {loan.customers && (
          <Link
            href={`/customers/${loan.customers.id}`}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {loan.customers.name} · {loan.customers.phone}
          </Link>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="Loan amount"
          value={formatINR(summary?.loan_amount ?? loan.loan_amount)}
        />
        <StatCard
          label="Interest accrued"
          value={formatINR(summary?.interest_accrued ?? 0)}
          hint={`${loan.rate_monthly}%/mo · ${loan.interest_mode}`}
        />
        <StatCard
          label="Total due"
          value={formatINR(summary?.total_due ?? loan.loan_amount)}
        />
        <StatCard
          label="Paid"
          value={formatINR(summary?.total_paid ?? 0)}
          variant={summary && summary.total_paid > 0 ? "success" : "default"}
        />
        <StatCard
          label="Balance"
          value={formatINR(summary?.balance ?? 0)}
          variant={
            summary && summary.balance > 0 && loan.status === "overdue"
              ? "warning"
              : "default"
          }
          hint={`${summary?.days_elapsed ?? 0} days elapsed`}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canPay ? (
          <PaymentDialog
            loanId={loan.id}
            loanNumber={loan.loan_number}
            balance={balance}
            interestOutstanding={interestOutstanding}
            customerName={loan.customers?.name ?? ""}
            customerPhone={loan.customers?.phone ?? ""}
            shopName={settings?.name ?? shop.name}
            shopUpi={settings?.upi_id ?? null}
            paymentTemplate={
              mergeWithDefaults(settings?.whatsapp_templates).payment_confirm
            }
          />
        ) : (
          <span title="Loan is closed">
            <Button variant="outline" size="sm" disabled>
              <HandCoinsIcon />
              Record Payment
            </Button>
          </span>
        )}
        {canPay && (
          <>
            <SendReminderButton loanId={loan.id} />
            <EditDueDateDialog
              loanId={loan.id}
              loanNumber={loan.loan_number}
              startDate={loan.start_date}
              currentDueDate={loan.due_date}
            />
            <CloseLoanDialog loanId={loan.id} loanNumber={loan.loan_number} />
          </>
        )}
        <SendStatementButton loanId={loan.id} />
        {loan.customers && (
          <RevokePassbookDialog
            customerId={loan.customers.id}
            customerName={loan.customers.name}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gold details */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>Gold details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight</span>
              <span>{loan.gold_weight_g} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purity</span>
              <span>{loan.gold_purity ?? "—"}</span>
            </div>
            {loan.gold_description && (
              <>
                <Separator />
                <p className="text-muted-foreground">{loan.gold_description}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start date</span>
              <span>{format(new Date(loan.start_date), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due date</span>
              <span>{format(new Date(loan.due_date), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {format(new Date(loan.created_at), "dd MMM yyyy, hh:mm a")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {format(new Date(p.paid_at), "dd MMM yyyy, hh:mm a")}
                    </TableCell>
                    <TableCell className="capitalize">{p.kind}</TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {audit.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="capitalize">{a.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "dd MMM yyyy, hh:mm a")}
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
