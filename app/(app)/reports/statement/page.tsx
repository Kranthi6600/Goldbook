import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { getCurrentShop } from "@/lib/queries/shops"
import { listCustomers } from "@/lib/queries/customers"
import { StatementGenerator } from "@/components/app/StatementGenerator"

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>
}) {
  const { customer: initialCustomerId } = await searchParams

  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }
  // Statements write nothing, but they're owner-facing reports — keep the
  // same gate as settings until a staff permission model exists.
  if (shop.role !== "owner") {
    redirect("/")
  }

  const customers = await listCustomers(shop.id)

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/reports"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to reports
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Monthly statement</h1>
        <p className="text-sm text-muted-foreground">
          Generate a PDF statement for one customer or the whole shop. Numbers
          are computed as of the period end date.
        </p>
      </div>

      <StatementGenerator
        shopId={shop.id}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        }))}
        initialCustomerId={initialCustomerId}
      />
    </div>
  )
}
