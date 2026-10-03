import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { getCurrentShop, listSlabs } from "@/lib/queries/shops"
import { SlabEditor } from "@/components/app/SlabEditor"

export default async function SlabsSettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const slabs = await listSlabs(shop.id)

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/settings"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to settings
      </Link>
      <SlabEditor shopId={shop.id} initialSlabs={slabs} />
    </div>
  )
}
