"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CircleAlertIcon } from "lucide-react"

import {
  CustomerSchema,
  ID_TYPES,
  type CustomerFormValues,
  type CustomerInput,
} from "@/lib/schemas/customer"
import { createCustomer, updateCustomer } from "@/lib/actions/customers"
import { normalizePhone } from "@/lib/utils/phone"
import type { CustomerRow } from "@/lib/queries/customers"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const NO_ID_TYPE = "__none__"

export function CustomerForm({
  customer,
  onSuccess,
}: {
  customer?: CustomerRow
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<CustomerFormValues, unknown, CustomerInput>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      id_type: (customer?.id_type ?? "") as CustomerFormValues["id_type"],
      id_number: customer?.id_number ?? "",
      notes: customer?.notes ?? "",
    },
  })

  function onSubmit(values: CustomerInput) {
    setError(null)
    startTransition(async () => {
      const result = customer
        ? await updateCustomer(customer.id, values)
        : await createCustomer(values)

      if (result.error) {
        setError(result.error)
        return
      }

      toast.success(customer ? "Customer updated" : "Customer added")
      router.refresh()
      onSuccess?.()
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not save customer</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Ramesh Kumar" {...field} />
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

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="House no., street, city" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="id_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID type</FormLabel>
                <Select
                  value={field.value || NO_ID_TYPE}
                  onValueChange={(v) =>
                    field.onChange(
                      v === NO_ID_TYPE
                        ? ""
                        : (v as CustomerFormValues["id_type"])
                    )
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {ID_TYPES.find((t) => t.value === field.value)
                          ?.label ?? "None"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_ID_TYPE}>None</SelectItem>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
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
            name="id_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID number</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
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
                <Textarea placeholder="Internal notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? "Saving…"
            : customer
              ? "Save changes"
              : "Add customer"}
        </Button>
      </form>
    </Form>
  )
}
