"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckIcon,
  CircleAlertIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  OnboardingSchema,
  slabsAreContinuous,
  DEFAULT_SLABS,
  type OnboardingInput,
} from "@/lib/schemas/shop"
import { createShop } from "@/lib/actions/shops"
import { normalizePhone } from "@/lib/utils/phone"
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
import { Separator } from "@/components/ui/separator"

const STEPS = ["Shop details", "Interest & slabs", "Payments"] as const

const STEP_FIELDS: FieldPath<OnboardingInput>[][] = [
  ["name", "phone", "address"],
  ["interest_mode", "slabs"],
  ["upi_id"],
]

export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [slabError, setSlabError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      interest_mode: "simple",
      slabs: DEFAULT_SLABS,
      upi_id: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slabs",
  })

  function appendSlab() {
    const slabs = form.getValues("slabs")
    const last = [...slabs].sort((a, b) => a.max_amount - b.max_amount).at(-1)
    append({
      min_amount: last ? last.max_amount + 1 : 0,
      max_amount: last ? last.max_amount + 50000 : 50000,
      rate_monthly: last?.rate_monthly ?? 1,
    })
  }

  async function goNext() {
    const fields = STEP_FIELDS[step]
    const ok = await form.trigger(fields)

    if (step === 1) {
      const continuous = slabsAreContinuous(form.getValues("slabs"))
      setSlabError(
        continuous
          ? null
          : "Slabs must form a continuous range: no overlaps, no gaps. Each min must equal the previous max + 1."
      )
      if (!ok || !continuous) return
    } else if (!ok) {
      return
    }

    setServerError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setServerError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  function onSubmit(values: OnboardingInput) {
    if (!slabsAreContinuous(values.slabs)) {
      setSlabError(
        "Slabs must form a continuous range: no overlaps, no gaps. Each min must equal the previous max + 1."
      )
      setStep(1)
      return
    }

    setServerError(null)
    startTransition(async () => {
      const result = await createShop(values)
      if (result.error) {
        setServerError(result.error)
      } else {
        router.push("/")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress indicator */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              className={cn(
                "h-1 rounded-full",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
            <span
              className={cn(
                "text-xs",
                i <= step ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Could not create shop</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Step 1 — Shop details */}
          {step === 0 && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Shree Ganesh Jewellers"
                        autoComplete="organization"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="98765 43210"
                        autoComplete="tel"
                        {...field}
                        onBlur={() => {
                          field.onChange(normalizePhone(field.value))
                          field.onBlur()
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Saved as +91XXXXXXXXXX.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Shop no., street, city"
                        autoComplete="street-address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Step 2 — Interest mode & slabs */}
          {step === 1 && (
            <>
              <FormField
                control={form.control}
                name="interest_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest mode</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        {(["simple", "compound"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => field.onChange(mode)}
                            className={cn(
                              "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm capitalize transition-colors",
                              field.value === mode
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-input hover:bg-muted"
                            )}
                          >
                            {mode}
                            {field.value === mode && (
                              <CheckIcon className="size-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Simple: P × rate × days/30. Compound: interest accrues on
                      accrued interest.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Interest slabs</p>
                    <p className="text-xs text-muted-foreground">
                      Monthly rate by loan amount (₹).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={appendSlab}
                  >
                    <PlusIcon /> Add slab
                  </Button>
                </div>

                <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 text-xs text-muted-foreground">
                  <span>Min ₹</span>
                  <span>Max ₹</span>
                  <span>Rate %/mo</span>
                  <span className="w-8" />
                </div>

                {fields.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2"
                  >
                    {(["min_amount", "max_amount", "rate_monthly"] as const).map(
                      (key) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name={`slabs.${index}.${key}`}
                          render={({ field }) => (
                            <FormItem className="gap-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step={key === "rate_monthly" ? 0.1 : 1}
                                  value={
                                    Number.isNaN(field.value)
                                      ? ""
                                      : field.value
                                  }
                                  onChange={(e) =>
                                    field.onChange(e.target.valueAsNumber)
                                  }
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove slab"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}

                {(slabError || form.formState.errors.slabs?.root?.message) && (
                  <p className="text-sm text-destructive">
                    {slabError ??
                      form.formState.errors.slabs?.root?.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 3 — Payments */}
          {step === 2 && (
            <>
              <FormField
                control={form.control}
                name="upi_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI ID (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="yourname@upi" {...field} />
                    </FormControl>
                    <FormDescription>
                      Shown to borrowers on their passbook page for payments.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0 || pending}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? "Creating shop…" : "Create shop"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
