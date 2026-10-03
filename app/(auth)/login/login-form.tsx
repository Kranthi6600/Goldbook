"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon, MailCheckIcon } from "lucide-react"

import { loginSchema, type LoginInput } from "@/lib/schemas/auth"
import { sendMagicLink } from "@/lib/actions/auth"
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

export function LoginForm({ serverError }: { serverError?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(serverError ?? null)
  const [pending, startTransition] = useTransition()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: LoginInput) {
    setError(null)
    const formData = new FormData()
    formData.set("email", values.email)

    startTransition(async () => {
      const result = await sendMagicLink(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSentTo(values.email)
      }
    })
  }

  if (sentTo) {
    return (
      <Alert>
        <MailCheckIcon />
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          We sent a sign-in link to <strong>{sentTo}</strong>. Click the link in
          the email to continue. You can close this tab.
        </AlertDescription>
      </Alert>
    )
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
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending link…" : "Send magic link"}
        </Button>
      </form>
    </Form>
  )
}
