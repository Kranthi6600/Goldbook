"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  CircleAlertIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { z } from "zod"

import {
  SlabsSchema,
  slabsAreContinuous,
  SLAB_CONTINUITY_ERROR,
  type SlabInput,
} from "@/lib/schemas/shop"
import { replaceSlabs } from "@/lib/actions/settings"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const SlabEditorSchema = z.object({ slabs: SlabsSchema })

type SlabEditorValues = z.input<typeof SlabEditorSchema>

export function SlabEditor({
  shopId,
  initialSlabs,
}: {
  shopId: string
  initialSlabs: SlabInput[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<SlabEditorValues>({
    resolver: zodResolver(SlabEditorSchema),
    defaultValues: { slabs: initialSlabs },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slabs",
  })

  // Real-time validation as the user types.
  const watched = form.watch("slabs")

  const problems: string[] = []
  watched.forEach((s, i) => {
    if (
      typeof s.min_amount !== "number" ||
      Number.isNaN(s.min_amount) ||
      typeof s.max_amount !== "number" ||
      Number.isNaN(s.max_amount)
    ) {
      problems.push(`Slab ${i + 1}: min and max are required.`)
    } else if (s.min_amount >= s.max_amount) {
      problems.push(`Slab ${i + 1}: min must be less than max.`)
    }
    if (
      typeof s.rate_monthly !== "number" ||
      Number.isNaN(s.rate_monthly) ||
      s.rate_monthly <= 0 ||
      s.rate_monthly >= 10
    ) {
      problems.push(`Slab ${i + 1}: rate must be > 0 and < 10%/month.`)
    }
  })
  const sorted = [...watched].sort((a, b) => a.min_amount - b.min_amount)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min_amount < sorted[i - 1].max_amount + 1) {
      problems.push(
        `Overlap: a slab starting at ₹${sorted[i].min_amount} begins before the previous slab ends.`
      )
      break
    }
    if (sorted[i].min_amount > sorted[i - 1].max_amount + 1) {
      problems.push(
        `Gap: no slab covers ₹${sorted[i - 1].max_amount + 1}–${sorted[i].min_amount - 1}.`
      )
      break
    }
  }
  const continuous = slabsAreContinuous(watched)
  const canSave = !pending && continuous && problems.length === 0

  function appendSlab() {
    const last = [...watched].sort((a, b) => a.max_amount - b.max_amount).at(-1)
    append({
      min_amount: last ? last.max_amount + 1 : 0,
      max_amount: last ? last.max_amount + 50000 : 50000,
      rate_monthly: last?.rate_monthly ?? 1,
    })
  }

  function onSubmit(values: SlabEditorValues) {
    setServerError(null)
    startTransition(async () => {
      const result = await replaceSlabs(shopId, values.slabs)
      if (result.error) {
        setServerError(result.error)
        return
      }
      toast.success("Slabs saved")
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-2xl flex-col gap-4"
      >
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not save slabs</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {problems.length > 0 && (
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>Fix these before saving</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {!continuous && problems.length === 0 && (
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>Slab range issue</AlertTitle>
            <AlertDescription>{SLAB_CONTINUITY_ERROR}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Monthly interest rate by loan amount (₹). Slabs must cover a
            continuous range.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={appendSlab}>
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
                            Number.isNaN(field.value) ? "" : field.value
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

        {form.formState.errors.slabs?.root?.message && (
          <p className="text-sm text-destructive">
            {form.formState.errors.slabs.root.message}
          </p>
        )}

        <div>
          <Button type="submit" disabled={!canSave}>
            {pending ? "Saving…" : "Save slabs"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
