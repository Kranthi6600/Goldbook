"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { BellIcon } from "lucide-react"

import { sendLoanReminder } from "@/lib/actions/loan-actions"
import { Button } from "@/components/ui/button"

/**
 * One-click WhatsApp reminder from the loan detail page.
 * The server action builds the message from the SQL loan_summary (source of
 * truth), logs it to reminders, and returns the wa.me link to open.
 */
export function SendReminderButton({ loanId }: { loanId: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await sendLoanReminder(loanId)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (res.waUrl) {
        window.open(res.waUrl, "_blank", "noopener")
      }
      toast.success("Reminder logged")
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      <BellIcon />
      {pending ? "Sending…" : "Send Reminder"}
    </Button>
  )
}
