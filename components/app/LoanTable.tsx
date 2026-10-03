"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { format } from "date-fns"

import type { LoanListItem, DisplayStatus } from "@/lib/queries/loans"
import { formatINR } from "@/lib/utils/money"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SortKey = "loan_number" | "customer" | "loan_amount" | "due_date" | "balance"

const STATUS_META: Record<DisplayStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "" },
  due_soon: {
    label: "Due soon",
    className:
      "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300",
  },
  overdue: { label: "Overdue", className: "" },
  closed: {
    label: "Closed",
    className:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  auctioned: { label: "Auctioned", className: "" },
  written_off: { label: "Written off", className: "" },
}

export function LoanTable({ loans }: { loans: LoanListItem[] }) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return loans
    const dir = sortDir === "asc" ? 1 : -1
    return [...loans].sort((a, b) => {
      switch (sortKey) {
        case "loan_number":
          return dir * a.loan_number.localeCompare(b.loan_number)
        case "customer":
          return dir * a.customer_name.localeCompare(b.customer_name)
        case "loan_amount":
          return dir * (a.loan_amount - b.loan_amount)
        case "due_date":
          return dir * a.due_date.localeCompare(b.due_date)
        case "balance":
          return dir * (a.balance - b.balance)
        default:
          return 0
      }
    })
  }, [loans, sortKey, sortDir])

  function SortableHead({ k, label, right }: { k: SortKey; label: string; right?: boolean }) {
    const active = sortKey === k
    return (
      <TableHead className={right ? "text-right" : undefined}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label}
          {active &&
            (sortDir === "asc" ? (
              <ArrowUpIcon className="size-3" />
            ) : (
              <ArrowDownIcon className="size-3" />
            ))}
        </button>
      </TableHead>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead k="loan_number" label="Loan #" />
          <SortableHead k="customer" label="Customer" />
          <TableHead>Gold</TableHead>
          <SortableHead k="loan_amount" label="Amount" right />
          <SortableHead k="due_date" label="Due Date" />
          <TableHead>Status</TableHead>
          <SortableHead k="balance" label="Balance" right />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((loan) => {
          const meta = STATUS_META[loan.displayStatus]
          return (
            <TableRow
              key={loan.id}
              className="cursor-pointer"
              onClick={() => router.push(`/loans/${loan.id}`)}
            >
              <TableCell className="font-medium">{loan.loan_number}</TableCell>
              <TableCell>{loan.customer_name}</TableCell>
              <TableCell className="whitespace-nowrap">
                {loan.gold_weight_g}g{loan.gold_purity ? ` ${loan.gold_purity}` : ""}
              </TableCell>
              <TableCell className="text-right">
                {formatINR(loan.loan_amount)}
              </TableCell>
              <TableCell>
                {format(new Date(loan.due_date), "dd MMM yyyy")}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    loan.displayStatus === "overdue" ? "destructive" : "outline"
                  }
                  className={cn(meta.className)}
                >
                  {meta.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatINR(loan.balance)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
