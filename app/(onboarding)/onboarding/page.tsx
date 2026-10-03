import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getCurrentShop } from "@/lib/queries/shops"
import { OnboardingForm } from "@/components/app/OnboardingForm"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const shop = await getCurrentShop()
  if (shop) {
    redirect("/")
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Set up your shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This takes about a minute. You can change everything later.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  )
}
