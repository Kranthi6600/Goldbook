import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon, CoinsIcon, PlusIcon } from "lucide-react"

import { getCurrentShop } from "@/lib/queries/shops"
import { listLoans, type LoanStatusFilter } from "@/lib/queries/loans"
import { Button } from "@/components/ui/button"
import { LoanFilters } from "@/components/app/LoanFilters"
import { LoanTable } from "@/components/app/LoanTable"
import { EmptyState } from "@/components/app/EmptyState"

const VALID_STATUS = new Set([
  "all",
  "active",
  "due_soon",
  "overdue",
  "closed",
])

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const params = await searchParams

  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  const status = (
    params.status && VALID_STATUS.has(params.status) ? params.status : "all"
  ) as LoanStatusFilter
  const page = Math.max(1, Number(params.page) || 1)

  const { loans, total, pageCount } = await listLoans(
    shop.id,
    { status, search: params.q },
    page
  )

  function pageHref(p: number) {
    const next = new URLSearchParams()
    if (params.status) next.set("status", params.status)
    if (params.q) next.set("q", params.q)
    if (p > 1) next.set("page", String(p))
    const qs = next.toString()
    return `/loans${qs ? `?${qs}` : ""}`
  }

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
        <h1 className="text-xl font-semibold">Loans</h1>
        <Button render={<Link href="/loans/new" />}>
          <PlusIcon />
          New Loan
        </Button>
      </div>

      <LoanFilters />

      {loans.length === 0 ? (
        <EmptyState
          icon={CoinsIcon}
          title={params.q || status !== "all" ? "No loans match" : "No loans yet"}
          description={
            params.q || status !== "all"
              ? "Try a different filter or search term."
              : "Create your first gold loan to see it here."
          }
          action={
            !params.q && status === "all"
              ? { label: "New loan", href: "/loans/new" }
              : undefined
          }
        />
      ) : (
        <>
          <LoanTable loans={loans} />
          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {total} loan{total === 1 ? "" : "s"} · page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  render={<Link href={pageHref(page - 1)} />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  render={<Link href={pageHref(page + 1)} />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
