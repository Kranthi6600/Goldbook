"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { FileTextIcon } from "lucide-react"

import { sendStatement } from "@/lib/actions/loan-actions"
import { Button } from "@/components/ui/button"

/**
 * Downloads the loan statement PDF. Server renders it via @react-pdf/renderer
 * and returns base64; we blob-download it here. WhatsApp attach stays manual
 * (no WhatsApp Business API in MVP).
 */
export function SendStatementButton({ loanId }: { loanId: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await sendStatement(loanId)
      if (res.error || !res.base64) {
        toast.error(res.error ?? "Could not generate statement.")
        return
      }

      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename ?? "statement.pdf"
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Statement downloaded — attach it in WhatsApp manually")
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      <FileTextIcon />
      {pending ? "Generating…" : "Send Statement"}
    </Button>
  )
}
