"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CircleAlertIcon, KeyRoundIcon } from "lucide-react"

import { revokePassbook } from "@/lib/actions/loan-actions"
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

export function RevokePassbookDialog({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await revokePassbook(customerId)
      if (res.error) {
        setError(res.error)
        return
      }
      toast.success(`Passbook revoked for ${customerName}`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <KeyRoundIcon />
        Revoke Passbook
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke passbook — {customerName}</DialogTitle>
          <DialogDescription>
            The borrower&apos;s passbook link will stop working immediately —
            every token for this customer is revoked. Use when a link was
            shared with the wrong person or the loan is disputed.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not revoke</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Revoking…" : "Revoke passbook"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
