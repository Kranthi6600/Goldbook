"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { CheckCheckIcon, MessageCircleIcon } from "lucide-react"

import type { ReminderKind, ReminderLoanItem } from "@/lib/queries/reminders"
import { logReminder, markAllReminders } from "@/lib/actions/reminders"
import {
  buildReminderMessage,
  passbookUrl,
  waLink,
} from "@/lib/utils/whatsapp"
import type { TemplateKey, WhatsAppTemplates } from "@/lib/utils/template"
import { formatINR } from "@/lib/utils/money"
import { Button } from "@/components/ui/button"

type ReminderShop = {
  name: string
  phone: string
  upi_id: string | null
  /** Merged shop templates (defaults fill any missing keys). */
  templates: WhatsAppTemplates
}

export function ReminderRow({
  item,
  kind,
  shop,
}: {
  item: ReminderLoanItem
  kind: ReminderKind
  shop: ReminderShop
}) {
  const router = useRouter()
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  const passbookLink = item.passbook_token
    ? passbookUrl(item.passbook_token)
    : ""

  const templateKey: TemplateKey =
    kind === "overdue" ? "overdue" : (`reminder_${kind}` as TemplateKey)

  const message = buildReminderMessage(shop.templates[templateKey], {
    customer_name: item.customer_name,
    loan_number: item.loan_number,
    loan_amount: formatINR(item.loan_amount),
    total_due: formatINR(item.total_due),
    due_date: format(new Date(item.due_date), "dd MMM yyyy"),
    days: String(Math.abs(item.days_to_due)),
    shop_name: shop.name,
    upi_link: shop.upi_id ?? "",
    passbook_url: passbookLink,
  })

  function onSend() {
    startTransition(async () => {
      // Log first — opening WhatsApp without logging would bypass dedupe.
      const result = await logReminder(item.loan_id, kind, message)
      if (result.error) {
        toast.error(result.error)
        return
      }
      window.open(waLink(item.customer_phone, message), "_blank")
      setSent(true)
      router.refresh()
    })
  }

  const dueLabel =
    item.days_to_due < 0
      ? `${-item.days_to_due}d overdue`
      : item.days_to_due === 0
        ? "due today"
        : `due in ${item.days_to_due}d`

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {item.customer_name}
          <span className="ml-2 font-normal text-muted-foreground">
            {item.loan_number}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {formatINR(item.total_due)} due ·{" "}
          {format(new Date(item.due_date), "dd MMM")} ({dueLabel})
        </span>
      </div>
      <Button
        variant={sent ? "secondary" : "outline"}
        size="sm"
        disabled={pending || sent}
        onClick={onSend}
      >
        <MessageCircleIcon />
        {sent ? "Sent" : "WhatsApp"}
      </Button>
    </div>
  )
}

export function MarkAllSentButton({
  kind,
  loanIds,
}: {
  kind: ReminderKind
  loanIds: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onMarkAll() {
    if (
      !window.confirm(
        `Mark ${loanIds.length} reminder${loanIds.length === 1 ? "" : "s"} as sent? They'll be removed from today's queue.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await markAllReminders(loanIds, kind)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          `${result.count} reminder${result.count === 1 ? "" : "s"} marked as sent`
        )
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending || loanIds.length === 0}
      onClick={onMarkAll}
    >
      <CheckCheckIcon />
      Mark all as sent
    </Button>
  )
}
