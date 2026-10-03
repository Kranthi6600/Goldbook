import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { getCurrentShop, getShopSettings } from "@/lib/queries/shops"
import { GeneralSettingsForm } from "@/components/app/GeneralSettingsForm"

export default async function GeneralSettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const settings = await getShopSettings(shop.id)
  if (!settings) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/settings"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to settings
      </Link>
      <GeneralSettingsForm shop={settings} />
    </div>
  )
}
