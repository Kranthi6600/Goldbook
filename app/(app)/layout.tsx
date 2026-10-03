import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getCurrentShop } from "@/lib/queries/shops"
import { AppNav } from "@/components/app/app-nav"

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav shopName={shop.name} isStaff={shop.role === "staff"} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
