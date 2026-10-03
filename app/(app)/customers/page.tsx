import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon, PlusIcon, UsersIcon } from "lucide-react"

import { getCurrentShop } from "@/lib/queries/shops"
import { listCustomers } from "@/lib/queries/customers"
import { Button } from "@/components/ui/button"
import { CustomerDialog } from "@/components/app/CustomerDialog"
import { CustomerSearch } from "@/components/app/CustomerSearch"
import { CustomerTable } from "@/components/app/CustomerTable"
import { EmptyState } from "@/components/app/EmptyState"

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const customers = await listCustomers(shop.id, q)

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Customers</h1>
        <CustomerDialog
          trigger={
            <Button>
              <PlusIcon />
              Add Customer
            </Button>
          }
        />
      </div>

      <CustomerSearch defaultValue={q ?? ""} />

      {customers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={q ? "No matches found" : "No customers yet"}
          description={
            q
              ? `Nothing matches "${q}". Try a different name or phone.`
              : "Add your first customer to start issuing gold loans."
          }
        />
      ) : (
        <CustomerTable customers={customers} />
      )}
    </div>
  )
}
