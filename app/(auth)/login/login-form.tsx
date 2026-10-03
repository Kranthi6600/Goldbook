"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlertIcon } from "lucide-react"

import { credentialsSchema, type CredentialsInput } from "@/lib/schemas/auth"
import { signInWithPassword, signUpWithPassword } from "@/lib/actions/auth"
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

type Mode = "sign-in" | "sign-up"

export function LoginForm({ serverError }: { serverError?: string }) {
  const [mode, setMode] = useState<Mode>("sign-in")
  const [error, setError] = useState<string | null>(serverError ?? null)
  const [pending, startTransition] = useTransition()

  const form = useForm<CredentialsInput>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  })

  const isSignUp = mode === "sign-up"

  function onSubmit(values: CredentialsInput) {
    setError(null)
    const formData = new FormData()
    formData.set("email", values.email)
    formData.set("password", values.password)

    startTransition(async () => {
      const action = isSignUp ? signUpWithPassword : signInWithPassword
      const result = await action(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  function toggleMode() {
    setError(null)
    setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))
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
            <AlertTitle>
              {isSignUp ? "Sign-up failed" : "Sign-in failed"}
            </AlertTitle>
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? "Working…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={toggleMode}
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </form>
    </Form>
  )
}
