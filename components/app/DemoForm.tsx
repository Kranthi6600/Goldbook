"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  CheckIcon,
  CircleAlertIcon,
  MessageCircleIcon,
} from "lucide-react"

import {
  LeadSchema,
  PLEDGE_RANGES,
  CURRENT_METHODS,
  type LeadInput,
  type LeadValues,
} from "@/lib/schemas/lead"
import { createLead } from "@/lib/actions/leads"
import { BRAND } from "@/lib/brand"
import { normalizePhone } from "@/lib/utils/phone"
import { salesWaLink } from "@/lib/utils/whatsapp"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function DemoForm() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<LeadInput, unknown, LeadValues>({
    resolver: zodResolver(LeadSchema),
    defaultValues: { name: "", shop_name: "", city: "", phone: "" },
  })

  function onSubmit(values: LeadValues) {
    setError(null)
    startTransition(async () => {
      const result = await createLead(values)
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
        toast.success("Demo request received!")
      }
    })
  }

  if (done) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/10 p-2">
              <CheckIcon className="size-5 text-emerald-600" />
            </div>
            <CardTitle>Request received</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            We'll call you within 1 working day. Want it faster? Ping us on
            WhatsApp right now.
          </p>
          <Button
            render={
              <a
                href={salesWaLink(
                  `Hi, I just booked a demo for ${BRAND.name} — I want to talk now.`
                )}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <MessageCircleIcon />
            Chat on WhatsApp
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full max-w-md flex-col gap-4"
      >
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not submit</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your name</FormLabel>
              <FormControl>
                <Input placeholder="Suresh Pawar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shop_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shop name</FormLabel>
              <FormControl>
                <Input placeholder="Shree Ganesh Jewellers" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Pune" {...field} />
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="98765 43210"
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
        </div>

        <FormField
          control={form.control}
          name="active_pledges"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Active pledges right now</FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLEDGE_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => field.onChange(r)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm transition-colors",
                        field.value === r
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-input hover:bg-muted"
                      )}
                    >
                      {r}
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
          name="current_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How do you track loans today?</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-1.5">
                  {CURRENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => field.onChange(m)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm transition-colors",
                        field.value === m
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-input hover:bg-muted"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Submitting…" : "Book a free demo"}
        </Button>
      </form>
    </Form>
  )
}
