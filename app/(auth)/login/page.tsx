import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to your shop</CardTitle>
          <CardDescription>
            Enter your email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm serverError={error} />
        </CardContent>
      </Card>
      <Link
        href="/landing"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        &larr; Back to home
      </Link>
    </main>
  )
}
