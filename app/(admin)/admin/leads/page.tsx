import { InboxIcon } from "lucide-react"

import { listAdminLeads } from "@/lib/queries/admin"
import { AdminLeadsTable } from "@/components/admin/AdminLeadsTable"
import { EmptyState } from "@/components/app/EmptyState"

export default async function AdminLeadsPage() {
  const leads = await listAdminLeads()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} lead{leads.length === 1 ? "" : "s"} — update status
          inline.
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No leads yet"
          description="Demo requests from the marketing site will land here."
        />
      ) : (
        <AdminLeadsTable leads={leads} />
      )}
    </div>
  )
}
