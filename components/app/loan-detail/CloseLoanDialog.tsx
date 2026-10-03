"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CircleAlertIcon, CircleSlashIcon } from "lucide-react"

import { closeLoan } from "@/lib/actions/loan-actions"
import { LoanActionReasonSchema } from "@/lib/schemas/loan-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function CloseLoanDialog({
  loanId,
  loanNumber,
}: {
  loanId: string
  loanNumber: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const reasonCheck = LoanActionReasonSchema.safeParse(reason)
  const reasonError =
    reason.length > 0 && !reasonCheck.success
      ? reasonCheck.error.issues[0]?.message
      : null

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setReason("")
      setError(null)
    }
  }

  function onConfirm() {
    if (!reasonCheck.success) return
    setError(null)
    startTransition(async () => {
      const res = await closeLoan(loanId, reason)
      if (res.error) {
        setError(res.error)
        return
      }
      toast.success(`Loan ${loanNumber} closed`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <CircleSlashIcon />
        Close Loan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close loan {loanNumber}</DialogTitle>
          <DialogDescription>
            Use this for administrative closes (settlement, dispute, gold
            returned without full payment). Full payment closes automatically
            via Record Payment.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>This marks the loan as closed</AlertTitle>
          <AlertDescription>
            This cannot be undone from the UI. The action and your reason are
            written to the audit log.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not close loan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="close-reason">Reason (required)</Label>
          <Textarea
            id="close-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Settled offline — gold returned to customer"
            rows={3}
          />
          {reasonError && (
            <p className="text-xs text-destructive">{reasonError}</p>
          )}
        </div>

        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={pending || !reasonCheck.success}
        >
          {pending ? "Closing…" : "Close loan"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
