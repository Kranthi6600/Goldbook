"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CircleAlertIcon } from "lucide-react"

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/schemas/auth"
import { changePassword } from "@/lib/actions/auth"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  })

  function onSubmit(values: ChangePasswordInput) {
    setError(null)
    const formData = new FormData()
    formData.set("new_password", values.new_password)
    formData.set("confirm_password", values.confirm_password)

    startTransition(async () => {
      const result = await changePassword(formData)
      if (result.error) {
        setError(result.error)
      } else {
        form.reset()
        toast.success("Password updated.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Used to sign in to your account. Minimum 6 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex max-w-sm flex-col gap-4"
          >
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>Couldn&apos;t update password</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Saving…" : "Update password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
