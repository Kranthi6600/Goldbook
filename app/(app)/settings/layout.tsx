import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getCurrentShop } from "@/lib/queries/shops"
import { SettingsTabs } from "@/components/app/SettingsTabs"

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  const shop = await getCurrentShop()
  // Settings are owner-only — hide the whole section from staff.
  if (!shop || shop.role !== "owner") {
    redirect("/")
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  )
}
