"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { CalendarClockIcon, CircleAlertIcon } from "lucide-react"

import { editLoanDueDate } from "@/lib/actions/loan-actions"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function EditDueDateDialog({
  loanId,
  loanNumber,
  startDate,
  currentDueDate,
}: {
  loanId: string
  loanNumber: string
  startDate: string
  currentDueDate: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState(currentDueDate)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Earliest valid due date = start_date + 1 day.
  const minDate = isoDay(
    new Date(new Date(startDate).getTime() + 86400000)
  )
  const dateInvalid =
    newDate.length === 10 && newDate <= startDate
  const reasonOk = LoanActionReasonSchema.safeParse(reason).success

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setNewDate(currentDueDate)
      setReason("")
      setError(null)
    }
  }

  function onConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await editLoanDueDate(loanId, newDate, reason)
      if (res.error) {
        setError(res.error)
        return
      }
      toast.success(`Due date updated for ${loanNumber}`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <CalendarClockIcon />
        Edit Due Date
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit due date — {loanNumber}</DialogTitle>
          <DialogDescription>
            Current due date:{" "}
            <span className="font-medium text-foreground">
              {format(new Date(currentDueDate), "dd MMM yyyy")}
            </span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not update due date</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-due-date">New due date</Label>
          <Input
            id="new-due-date"
            type="date"
            min={minDate}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          {dateInvalid && (
            <p className="text-xs text-destructive">
              Must be after the start date (
              {format(new Date(startDate), "dd MMM yyyy")}).
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due-reason">Reason (required)</Label>
          <Textarea
            id="due-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested extension — agreed 30 more days"
            rows={3}
          />
          {reason.length > 0 && !reasonOk && (
            <p className="text-xs text-destructive">
              Give a short reason (at least 5 characters).
            </p>
          )}
        </div>

        <Button
          onClick={onConfirm}
          disabled={pending || dateInvalid || !reasonOk || newDate === currentDueDate}
        >
          {pending ? "Saving…" : "Update due date"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
