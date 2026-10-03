import { LifeBuoyIcon } from "lucide-react"

import { EmptyState } from "@/components/app/EmptyState"

export default function AdminSupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Support</h1>
      <EmptyState
        icon={LifeBuoyIcon}
        title="Support inbox"
        description="Shopkeeper support requests will appear here. Coming soon."
      />
    </div>
  )
}
