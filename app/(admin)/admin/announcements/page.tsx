import { MegaphoneIcon } from "lucide-react"

import { EmptyState } from "@/components/app/EmptyState"

export default function AdminAnnouncementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Announcements</h1>
      <EmptyState
        icon={MegaphoneIcon}
        title="Announcements"
        description="Broadcast announcements to all shops. Coming soon."
      />
    </div>
  )
}
