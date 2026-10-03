"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

import type { CustomerListItem, CustomerRow } from "@/lib/queries/customers"
import { deleteCustomer } from "@/lib/actions/customers"
import { formatINR } from "@/lib/utils/money"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CustomerDialog } from "@/components/app/CustomerDialog"

export function CustomerTable({
  customers,
}: {
  customers: CustomerListItem[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [pending, startTransition] = useTransition()

  function onDelete(customer: CustomerListItem) {
    if (
      !window.confirm(
        `Delete ${customer.name}? This cannot be undone.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await deleteCustomer(customer.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Customer deleted")
        router.refresh()
      }
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Active Loans</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="cursor-pointer"
              onClick={() => router.push(`/customers/${customer.id}`)}
            >
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell className="text-right">
                {customer.activeLoanCount}
              </TableCell>
              <TableCell className="text-right">
                {formatINR(customer.outstanding)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <EllipsisIcon />
                    <span className="sr-only">Actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(customer)}>
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={pending || customer.activeLoanCount > 0}
                      onClick={() => onDelete(customer)}
                    >
                      <Trash2Icon />
                      {customer.activeLoanCount > 0
                        ? "Delete (has active loans)"
                        : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CustomerDialog
        customer={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
    </>
  )
}
