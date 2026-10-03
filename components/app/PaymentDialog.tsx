"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CheckIcon,
  CircleAlertIcon,
  HandCoinsIcon,
  MessageCircleIcon,
} from "lucide-react"

import {
  PAYMENT_METHODS,
  createPaymentSchema,
  type PaymentFormValues,
} from "@/lib/schemas/payment"
import { recordPayment } from "@/lib/actions/payments"
import { formatINR } from "@/lib/utils/money"
import { buildPaymentMessage, waLink } from "@/lib/utils/whatsapp"
import { cn } from "@/lib/utils"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type PaymentResult = {
  payment: { id: string; amount: number; method: string; paid_at: string }
  newBalance: number
  loanClosed: boolean
}

const PAYMENT_KINDS = [
  { value: "interest", label: "Interest" },
  { value: "principal", label: "Principal" },
  { value: "mixed", label: "Mixed" },
] as const

export function PaymentDialog({
  loanId,
  loanNumber,
  balance,
  interestOutstanding,
  customerName,
  customerPhone,
  shopName,
  shopUpi,
  paymentTemplate,
}: {
  loanId: string
  loanNumber: string
  balance: number
  /** Accrued interest not yet covered by interest-kind payments. */
  interestOutstanding: number
  customerName: string
  customerPhone: string
  shopName: string
  shopUpi: string | null
  /** Shop's payment_confirm template (Settings → WhatsApp). */
  paymentTemplate: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const schema = useMemo(() => createPaymentSchema(Math.ceil(balance)), [balance])

  const defaultPaidAt = () => format(new Date(), "yyyy-MM-dd'T'HH:mm")

  // Interest is the common daily case; fall back to mixed when none is due.
  const defaultKind = interestOutstanding > 0 ? "interest" : "mixed"

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Worker enters the amount by hand — no prefill.
      // NaN renders as an empty input (field renders "" for NaN).
      amount: Number.NaN,
      method: "cash",
      kind: defaultKind,
      reference: "",
      paid_at: defaultPaidAt(),
      notes: "",
    },
  })

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset for next open.
      setResult(null)
      setError(null)
      form.reset({
        amount: Number.NaN,
        method: "cash",
        kind: defaultKind,
        reference: "",
        paid_at: defaultPaidAt(),
        notes: "",
      })
    }
  }

  function onSubmit(values: PaymentFormValues) {
    setError(null)
    startTransition(async () => {
      const res = await recordPayment(loanId, values)
      if (res.payment && res.newBalance !== undefined) {
        setResult({
          payment: res.payment,
          newBalance: res.newBalance,
          loanClosed: res.loanClosed ?? false,
        })
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success(
            res.loanClosed ? "Payment recorded — loan closed" : "Payment recorded"
          )
        }
        router.refresh()
      } else {
        setError(res.error ?? "Failed to record payment.")
      }
    })
  }

  const waUrl =
    result && customerPhone
      ? waLink(
          customerPhone,
          buildPaymentMessage(paymentTemplate, {
            customer_name: customerName,
            loan_number: loanNumber,
            payment_amount: formatINR(result.payment.amount),
            balance: formatINR(result.newBalance),
            total_due: formatINR(result.newBalance),
            shop_name: shopName,
            upi_link: shopUpi ?? "",
          })
        )
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={balance <= 0} />
        }
      >
        <HandCoinsIcon />
        Record Payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment — {loanNumber}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <div className="rounded-full bg-emerald-500/10 p-2.5">
                <CheckIcon className="size-6 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold">
                {formatINR(result.payment.amount)} received
              </p>
              <p className="text-sm text-muted-foreground">
                {result.loanClosed
                  ? "Loan fully paid and closed."
                  : `Remaining balance: ${formatINR(result.newBalance)}`}
              </p>
            </div>

            {waUrl && (
              <Button
                render={<a href={waUrl} target="_blank" rel="noreferrer" />}
              >
                <MessageCircleIcon />
                Send Payment Confirmation on WhatsApp
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="rounded-lg bg-muted px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Outstanding balance
                </p>
                <p className="text-xl font-semibold">{formatINR(balance)}</p>
                {interestOutstanding > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Interest due: {formatINR(interestOutstanding)}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  <AlertTitle>Could not record payment</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.01}
                        value={Number.isNaN(field.value) ? "" : field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment type</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PAYMENT_KINDS.map((k) => (
                          <button
                            key={k.value}
                            type="button"
                            onClick={() => field.onChange(k.value)}
                            className={cn(
                              "rounded-lg border px-2 py-2 text-sm transition-colors",
                              field.value === k.value
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-input hover:bg-muted"
                            )}
                          >
                            {k.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-1.5">
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => field.onChange(m.value)}
                            className={cn(
                              "rounded-lg border px-2 py-2 text-sm transition-colors",
                              field.value === m.value
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-input hover:bg-muted"
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="paid_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="UPI ref / receipt no." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Internal note" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={pending}>
                {pending ? "Recording…" : "Record payment"}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
