"use client"

import { useRouter } from "next/navigation"

import type { LoanListItem } from "@/lib/queries/loans"
import { formatINR } from "@/lib/utils/money"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUS_STYLES: Record<string, { label: string; destructive: boolean }> = {
  active: { label: "Active", destructive: false },
  due_soon: { label: "Due soon", destructive: false },
  overdue: { label: "Overdue", destructive: true },
}

/** Dashboard list of open loans — interest + balance come from loan_summaries. */
export function ActiveLoansTable({ loans }: { loans: LoanListItem[] }) {
  const router = useRouter()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Loan #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Interest accrued</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.map((loan) => {
          const meta = STATUS_STYLES[loan.displayStatus] ?? {
            label: loan.displayStatus.replace("_", " "),
            destructive: false,
          }
          return (
            <TableRow
              key={loan.id}
              className="cursor-pointer"
              onClick={() => router.push(`/loans/${loan.id}`)}
            >
              <TableCell className="font-medium">{loan.loan_number}</TableCell>
              <TableCell>{loan.customer_name}</TableCell>
              <TableCell className="text-right">
                {formatINR(loan.loan_amount)}
              </TableCell>
              <TableCell className="text-right font-medium text-amber-700 dark:text-amber-400">
                {formatINR(loan.interest_accrued)}
              </TableCell>
              <TableCell className="text-right">
                {formatINR(loan.balance)}
              </TableCell>
              <TableCell>
                <Badge variant={meta.destructive ? "destructive" : "outline"}>
                  {meta.label}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
