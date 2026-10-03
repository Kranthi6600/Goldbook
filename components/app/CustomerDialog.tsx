"use client"

import { useState, type ReactElement } from "react"

import type { CustomerRow } from "@/lib/queries/customers"
import { CustomerForm } from "@/components/app/CustomerForm"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function CustomerDialog({
  trigger,
  customer,
  open,
  onOpenChange,
}: {
  /** When provided, renders an uncontrolled trigger button. */
  trigger?: ReactElement
  /** When provided, the dialog edits this customer instead of creating. */
  customer?: CustomerRow
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit customer" : "Add customer"}
          </DialogTitle>
        </DialogHeader>
        <CustomerForm
          customer={customer}
          onSuccess={() => setOpen?.(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
