import { StoreIcon } from "lucide-react"

import { listAdminShops } from "@/lib/queries/admin"
import { AdminShopsTable } from "@/components/admin/AdminShopsTable"
import { EmptyState } from "@/components/app/EmptyState"

export default async function AdminShopsPage() {
  const shops = await listAdminShops()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Shops</h1>
        <p className="text-sm text-muted-foreground">
          {shops.length} shop{shops.length === 1 ? "" : "s"} on the platform.
        </p>
      </div>

      {shops.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title="No shops yet"
          description="Shops will appear here after onboarding."
        />
      ) : (
        <AdminShopsTable shops={shops} />
      )}
    </div>
  )
}
