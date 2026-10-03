import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { ChangePasswordForm } from "@/components/app/ChangePasswordForm"

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/settings"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to settings
      </Link>
      <ChangePasswordForm />
    </div>
  )
}
