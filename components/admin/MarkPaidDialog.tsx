"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { addDays, addMonths, differenceInCalendarDays, format } from "date-fns"
import { CircleAlertIcon, IndianRupeeIcon } from "lucide-react"

import { markShopPaid } from "@/lib/actions/admin-billing"
import { formatINR } from "@/lib/utils/money"
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
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PLANS = [
  { value: "base", label: "Base", price: 999 },
  { value: "base_messages", label: "Base + Messages", price: 1499 },
  { value: "base_messages_comm", label: "Base + Messages + Comm", price: 1999 },
] as const

const METHODS = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
] as const

const PERIODS = [1, 3, 6, 12]

const FormSchema = z.object({
  plan: z.enum(["base", "base_messages", "base_messages_comm"]),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["upi", "cash", "bank"]),
  reference: z.string().trim().max(100).optional(),
  period_months: z.number().int().min(1).max(12),
})
type FormValues = z.infer<typeof FormSchema>

export function MarkPaidDialog({
  shop,
}: {
  shop: { id: string; name: string; plan: string; trial_ends_at: string | null }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const trialEnd = shop.trial_ends_at ? new Date(shop.trial_ends_at) : null
  const daysLeft = trialEnd
    ? differenceInCalendarDays(trialEnd, new Date())
    : null

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      plan: "base",
      amount: 999,
      method: "upi",
      reference: "",
      period_months: 1,
    },
  })

  const period = form.watch("period_months")

  // Mirrors activate_subscription: greatest(current trial end, today + period).
  const previewDate = useMemo(() => {
    const computed = addMonths(new Date(), period)
    return trialEnd && trialEnd > computed ? trialEnd : computed
  }, [period, trialEnd])

  function onSubmit(values: FormValues) {
    setError(null)
    startTransition(async () => {
      const res = await markShopPaid(shop.id, values)
      if (res.error) {
        setError(res.error)
      } else {
        toast.success(`${shop.name} marked as paid`)
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <IndianRupeeIcon />
        Mark as Paid
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid — {shop.name}</DialogTitle>
          <DialogDescription>
            Current plan: {shop.plan}
            {trialEnd && daysLeft !== null && (
              <>
                {" · "}
                Trial {daysLeft < 0 ? "ended" : "ends"}{" "}
                {format(trialEnd, "MMM d, yyyy")} (
                {daysLeft < 0
                  ? `expired ${-daysLeft} day${-daysLeft === 1 ? "" : "s"} ago`
                  : daysLeft === 0
                    ? "today"
                    : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                )
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not record payment</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PLANS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            field.onChange(p.value)
                            form.setValue("amount", p.price)
                          }}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
                            field.value === p.value
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-input hover:bg-muted"
                          )}
                        >
                          <span>{p.label}</span>
                          <span className="text-muted-foreground">
                            {formatINR(p.price)}/month
                          </span>
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1}
                        value={
                          Number.isNaN(field.value) ? "" : (field.value ?? "")
                        }
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
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="period_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Months" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIODS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {m} month{m === 1 ? "" : "s"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="UPI txn 4218…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Will extend trial_ends_at to{" "}
              <span className="font-medium text-foreground">
                {format(addDays(previewDate, 0), "MMM d, yyyy")}
              </span>
            </p>

            <Button type="submit" disabled={pending}>
              {pending ? "Recording…" : "Confirm payment"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
