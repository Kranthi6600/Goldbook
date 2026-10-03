import { redirect } from "next/navigation"

import { getCurrentShop } from "@/lib/queries/shops"
import { listStaff } from "@/lib/queries/staff"
import { StaffManager } from "@/components/app/StaffManager"

export default async function StaffSettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }
  // Owner only — staff manage loans, not other staff.
  if (shop.role !== "owner") {
    redirect("/")
  }

  const staff = await listStaff(shop.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-medium">Staff</h2>
        <p className="text-sm text-muted-foreground">
          Invite people to help run the shop. Staff can view and manage
          customers, loans, and reminders — only owners can change settings.
        </p>
      </div>
      <StaffManager shopId={shop.id} staff={staff} />
    </div>
  )
}
