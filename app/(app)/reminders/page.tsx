import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon, BellOffIcon } from "lucide-react"

import { getCurrentShop, getShopSettings } from "@/lib/queries/shops"
import { mergeWithDefaults } from "@/lib/utils/template"
import { getTodayReminders, type ReminderKind } from "@/lib/queries/reminders"
import { EmptyState } from "@/components/app/EmptyState"
import { ReminderRow, MarkAllSentButton } from "@/components/app/ReminderRow"

const SECTIONS: { kind: ReminderKind; title: string; description: string }[] = [
  {
    kind: "overdue",
    title: "Overdue",
    description: "Due date has passed — highest priority.",
  },
  { kind: "1d", title: "Due tomorrow", description: "Due date is tomorrow." },
  { kind: "3d", title: "Due in 3 days", description: "Due date is in 3 days." },
  { kind: "7d", title: "Due in 7 days", description: "Due date is in 7 days." },
]

export default async function RemindersPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const [queue, settings] = await Promise.all([
    getTodayReminders(shop.id),
    getShopSettings(shop.id),
  ])

  const shopInfo = {
    name: settings?.name ?? shop.name,
    phone: settings?.phone ?? "",
    upi_id: settings?.upi_id ?? null,
    templates: mergeWithDefaults(settings?.whatsapp_templates),
  }

  const total = Object.values(queue).reduce((s, items) => s + items.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Nothing due today."
            : `${total} loan${total === 1 ? "" : "s"} need a reminder today. WhatsApp opens — you send it manually.`}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={BellOffIcon}
          title="All caught up"
          description="No reminders due today, or all reminders have already been sent."
        />
      ) : (
        SECTIONS.map(({ kind, title, description }) => {
          const items = queue[kind]
          if (items.length === 0) return null
          return (
            <section key={kind} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">
                    {title}{" "}
                    <span className="text-muted-foreground">
                      ({items.length})
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {items.length > 1 && (
                  <MarkAllSentButton
                    kind={kind}
                    loanIds={items.map((i) => i.loan_id)}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <ReminderRow
                    key={item.loan_id}
                    item={item}
                    kind={kind}
                    shop={shopInfo}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
