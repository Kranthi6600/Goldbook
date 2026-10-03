import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
} from "lucide-react"

import { getCurrentShop } from "@/lib/queries/shops"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function ReportsPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
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

      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Export your shop data for compliance and record-keeping.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <DownloadIcon className="size-4 text-primary" />
              </div>
              <CardTitle className="text-base">Compliance Export</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Downloads a ZIP of CSV files containing your complete register:
            </p>
            <ul className="list-disc pl-4 text-sm text-muted-foreground">
              <li>Loan register — every loan with all fields</li>
              <li>Payments — every payment recorded</li>
              <li>Customers — full KYC data</li>
              <li>Audit log — last 1,000 entries</li>
            </ul>
            <Button
              render={<a href="/reports/export" download />}
              className="w-full"
            >
              <DownloadIcon />
              Download export (ZIP)
            </Button>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-2">
                <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Monthly Statement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              A monthly PDF statement — per customer or the whole shop — with
              interest accrued and balances as of the period end.
            </p>
            <Button
              variant="outline"
              render={<Link href="/reports/statement" />}
              className="w-full"
            >
              <FileSpreadsheetIcon />
              Generate statement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
