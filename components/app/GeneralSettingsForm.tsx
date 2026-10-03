"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CheckIcon, CircleAlertIcon } from "lucide-react"

import {
  ShopSettingsSchema,
  type ShopSettingsInput,
  type ShopSettingsValues,
} from "@/lib/schemas/shop"
import { updateShopSettings } from "@/lib/actions/settings"
import { normalizePhone } from "@/lib/utils/phone"
import type { ShopSettings } from "@/lib/queries/shops"
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

export function GeneralSettingsForm({ shop }: { shop: ShopSettings }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<ShopSettingsInput, unknown, ShopSettingsValues>({
    resolver: zodResolver(ShopSettingsSchema),
    defaultValues: {
      name: shop.name,
      phone: shop.phone,
      address: shop.address ?? "",
      upi_id: shop.upi_id ?? "",
      interest_mode: shop.interest_mode,
      grace_days: shop.grace_days,
    },
  })

  function onSubmit(values: ShopSettingsValues) {
    setError(null)
    startTransition(async () => {
      const result = await updateShopSettings(shop.id, values)
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success("Settings saved")
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-lg flex-col gap-4"
      >
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not save settings</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shop name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                  {...field}
                  onBlur={() => {
                    field.onChange(normalizePhone(field.value))
                    field.onBlur()
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Shop no., street, city" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                Shown to borrowers on their passbook page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                Applies to new loans. Existing loans keep their frozen rate and
                mode.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="grace_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grace days</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={90}
                  step={1}
                  className="w-28"
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Extra days after due date before a loan is marked overdue.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
