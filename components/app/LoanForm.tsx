"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, addDays } from "date-fns"
import {
  CheckIcon,
  CircleAlertIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  TriangleAlertIcon,
  UserIcon,
  XIcon,
} from "lucide-react"

import {
  LoanFormSchema,
  GOLD_PURITIES,
  type LoanFormValues,
  type LoanFormOutput,
} from "@/lib/schemas/loan"
import { createLoan, getSlabRateAction } from "@/lib/actions/loans"
import { searchCustomersAction } from "@/lib/actions/customers"
import { calcInterestPreview } from "@/lib/utils/interest-preview"
import { formatINR } from "@/lib/utils/money"
import { normalizePhone } from "@/lib/utils/phone"
import {
  buildReceiptMessage,
  passbookUrl,
  waLink,
} from "@/lib/utils/whatsapp"
import { mergeWithDefaults } from "@/lib/utils/template"
import type { CustomerSearchResult } from "@/lib/queries/customers"
import { cn } from "@/lib/utils"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type ShopForForm = {
  name: string
  phone: string
  upi_id: string | null
  interest_mode: "simple" | "compound"
  /** Per-shop editable WhatsApp templates (Settings → WhatsApp). */
  whatsapp_templates: unknown
}

type CreatedLoan = {
  loanId: string
  loanNumber: string
  passbookToken?: string
  customer: { name: string; phone: string }
  values: LoanFormOutput
  warning?: string
}

function todayStr() {
  return format(new Date(), "yyyy-MM-dd")
}

export function LoanForm({ shop }: { shop: ShopForForm }) {
  const router = useRouter()
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null)
  const [created, setCreated] = useState<CreatedLoan | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const rateTouched = useRef(false)

  const form = useForm<LoanFormValues, unknown, LoanFormOutput>({
    resolver: zodResolver(LoanFormSchema),
    defaultValues: {
      customer_id: "",
      gold_purity: "22K",
      interest_mode: shop.interest_mode,
      start_date: todayStr(),
      due_date: format(addDays(new Date(), 90), "yyyy-MM-dd"),
    },
  })

  // Customer autocomplete: empty query = browse all customers.
  function fetchCustomers(q: string) {
    void searchCustomersAction(q)
      .then(({ results, error }) => {
        setSearchError(error ?? null)
        setResults(results)
        setDropdownOpen(true)
      })
      .catch(() => {
        // Network-level failure (dev server compiling/restarting).
        // Show inline, never let it become an unhandled rejection.
        setSearchError("Could not reach server — try again.")
        setResults([])
        setDropdownOpen(true)
      })
  }

  // Debounced refetch as the user types (any length, including empty).
  useEffect(() => {
    if (mode !== "existing" || selected) {
      return
    }
    const timer = setTimeout(() => fetchCustomers(query.trim()), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode, selected])

  function pickCustomer(c: CustomerSearchResult) {
    setSelected(c)
    form.setValue("customer_id", c.id, { shouldValidate: true })
    setDropdownOpen(false)
    setResults([])
  }

  function clearCustomer() {
    setSelected(null)
    setQuery("")
    form.setValue("customer_id", "")
  }

  function switchMode(next: "existing" | "new") {
    setMode(next)
    setServerError(null)
    if (next === "existing") {
      form.setValue("new_customer", undefined)
    } else {
      clearCustomer()
      form.setValue("new_customer", { name: "", phone: "" })
    }
  }

  async function autoFillRate() {
    const amount = form.getValues("loan_amount")
    if (rateTouched.current || !amount || Number.isNaN(amount)) return
    const { rate } = await getSlabRateAction(amount)
    if (rate !== undefined) {
      form.setValue("rate_monthly", rate, { shouldValidate: true })
    }
  }

  function onSubmit(values: LoanFormOutput) {
    setServerError(null)
    const customer = selected ?? {
      name: values.new_customer?.name ?? "",
      phone: values.new_customer?.phone ?? "",
    }

    // rate_monthly is display-only (preview/autofill). The server derives the
    // real rate from slabs — never send the client-editable value.
    const { rate_monthly: _displayOnly, ...payload } = values

    startTransition(async () => {
      const result = await createLoan(payload)
      if (result.loanId) {
        // Token failures still return loanId + error — show success with a warning.
        setCreated({
          loanId: result.loanId,
          loanNumber: result.loanNumber!,
          passbookToken: result.passbookToken,
          customer,
          values,
          warning: result.error,
        })
        if (!result.error) router.refresh()
      } else {
        setServerError(result.error ?? "Failed to create loan.")
      }
    })
  }

  // ---- Live preview ----
  const [amount, rate, startDate, dueDate, mode_] = form.watch([
    "loan_amount",
    "rate_monthly",
    "start_date",
    "due_date",
    "interest_mode",
  ])
  const previewInterest =
    amount &&
    amount > 0 &&
    rate &&
    rate > 0 &&
    startDate &&
    dueDate &&
    dueDate > startDate
      ? calcInterestPreview(amount, rate, startDate, dueDate, mode_ ?? "simple")
      : 0

  // ---- Success screen ----
  if (created) {
    const passbookLink = created.passbookToken
      ? passbookUrl(created.passbookToken)
      : ""
    const templates = mergeWithDefaults(shop.whatsapp_templates)
    const waUrl =
      created.passbookToken && created.customer.phone
        ? waLink(
            created.customer.phone,
            buildReceiptMessage(templates.receipt, {
              customer_name: created.customer.name,
              loan_number: created.loanNumber,
              loan_amount: formatINR(created.values.loan_amount),
              due_date: format(
                new Date(created.values.due_date),
                "dd MMM yyyy"
              ),
              shop_name: shop.name,
              upi_link: shop.upi_id ?? "",
              passbook_url: passbookLink,
            })
          )
        : null

    return (
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/10 p-2">
              <CheckIcon className="size-5 text-emerald-600" />
            </div>
            <CardTitle>Loan created</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg bg-muted px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Loan number</p>
            <p className="text-2xl font-semibold tracking-wide">
              {created.loanNumber}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Customer</span>
            <span className="text-right">{created.customer.name}</span>
            <span className="text-muted-foreground">Amount</span>
            <span className="text-right">
              {formatINR(created.values.loan_amount)}
            </span>
            <span className="text-muted-foreground">Due date</span>
            <span className="text-right">{created.values.due_date}</span>
          </div>

          {created.warning && (
            <Alert>
              <TriangleAlertIcon />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>{created.warning}</AlertDescription>
            </Alert>
          )}

          {waUrl ? (
            <Button render={<a href={waUrl} target="_blank" rel="noreferrer" />}>
              <MessageCircleIcon />
              Send Receipt on WhatsApp
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Passbook link unavailable — share it later from the loan page.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                form.reset()
                setCreated(null)
                clearCustomer()
              }}
            >
              <PlusIcon />
              Create Another Loan
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/loans/${created.loanId}`)}
            >
              Go to Loan
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ---- Form ----
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="flex flex-col gap-6">
          {serverError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Could not create loan</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Customer */}
          <Card size="sm" className="overflow-visible">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["existing", "Existing customer"],
                    ["new", "New customer"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      mode === m
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-input hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input type="hidden" {...form.register("customer_id")} />

              {mode === "existing" ? (
                selected ? (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="size-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium">{selected.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {selected.phone}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={clearCustomer}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => fetchCustomers(query.trim())}
                      onBlur={() => setDropdownOpen(false)}
                      placeholder="Search by name or phone"
                      className="pl-8"
                      autoComplete="off"
                    />
                    {searchError && (
                      <p className="mt-1 text-sm text-destructive">
                        {searchError}
                      </p>
                    )}
                    {dropdownOpen && (
                      <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover py-1 text-sm shadow-md">
                        {results.length === 0 ? (
                          <li className="px-3 py-2 text-xs text-muted-foreground">
                            {searchError
                              ? "Search failed — check the error above."
                              : "No customers yet — switch to New customer below."}
                          </li>
                        ) : (
                          results.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickCustomer(c)}
                              >
                                <span>{c.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {c.phone}
                                </span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                )
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="new_customer.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ramesh Kumar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="new_customer.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            placeholder="98765 43210"
                            {...field}
                            onBlur={() => {
                              field.onChange(normalizePhone(field.value ?? ""))
                              field.onBlur()
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {form.formState.errors.customer_id?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.customer_id.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Gold */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Gold item</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gold_weight_g"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (grams)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.1}
                          placeholder="12.5"
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
                  name="gold_purity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purity</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 gap-1.5">
                          {GOLD_PURITIES.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => field.onChange(p.value)}
                              className={cn(
                                "rounded-lg border px-2 py-2 text-sm transition-colors",
                                field.value === p.value
                                  ? "border-primary bg-primary/5 font-medium"
                                  : "border-input hover:bg-muted"
                              )}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="gold_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. 1 chain, 2 bangles, 1 ring — with photo later"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Loan */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Loan terms</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="loan_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={100}
                          placeholder="50000"
                          value={Number.isNaN(field.value) ? "" : field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          onBlur={() => {
                            field.onBlur()
                            void autoFillRate()
                          }}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Rate auto-fills from your slabs.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate_monthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate %/month</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.1}
                          placeholder="2"
                          value={Number.isNaN(field.value) ? "" : field.value ?? ""}
                          onChange={(e) => {
                            rateTouched.current = true
                            field.onChange(e.target.valueAsNumber)
                          }}
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
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="interest_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest mode</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        {(["simple", "compound"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => field.onChange(m)}
                            className={cn(
                              "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm capitalize transition-colors",
                              field.value === m
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-input hover:bg-muted"
                            )}
                          >
                            {m}
                            {field.value === m && (
                              <CheckIcon className="size-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span>
                  {amount > 0 ? formatINR(amount) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Interest to {dueDate || "due date"}
                </span>
                <span>
                  {previewInterest > 0 ? formatINR(previewInterest) : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total due</span>
                <span>
                  {previewInterest > 0
                    ? formatINR(amount + previewInterest)
                    : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {rate > 0 ? `${rate}%/month` : "—"} · {mode_} ·{" "}
                {startDate || "—"} → {dueDate || "—"}
              </p>
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>LTV guideline (RBI)</AlertTitle>
                <AlertDescription>
                  Max 85% of gold value up to ₹2.5L, 80% for ₹2.5–5L, 75% above
                  ₹5L. Valuation capture is not available yet — verify manually.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Creating loan…" : "Create loan"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
