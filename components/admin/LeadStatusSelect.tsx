"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateLeadStatus } from "@/lib/actions/admin"
import { cn } from "@/lib/utils"

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "demo", label: "Demo" },
  { value: "onboarded", label: "Onboarded" },
  { value: "lost", label: "Lost" },
] as const

const STATUS_TONE: Record<string, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300",
  contacted:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
  demo: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
  onboarded:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
  lost: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-400/30 dark:bg-zinc-400/10 dark:text-zinc-400",
}

export function LeadStatusSelect({
  leadId,
  status,
}: {
  leadId: string
  status: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(status)
  const [pending, startTransition] = useTransition()

  function onChange(next: string) {
    const prev = value
    setValue(next)
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, next)
      if (result.error) {
        setValue(prev)
        toast.error(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-28 cursor-pointer rounded-lg border px-2 py-1 text-xs font-medium outline-none transition-opacity disabled:opacity-50",
        STATUS_TONE[value] ?? STATUS_TONE.new
      )}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
