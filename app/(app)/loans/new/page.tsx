import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getCurrentShop } from "@/lib/queries/shops"
import { LoanForm } from "@/components/app/LoanForm"

export default async function NewLoanPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }

  // Receipt message needs phone + upi_id — not on the cached ShopSummary.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shops")
    .select("name, phone, upi_id, whatsapp_templates")
    .eq("id", shop.id)
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to load shop details: ${error?.message ?? "not found"}`
    )
  }

  const details = data as {
    name: string
    phone: string
    upi_id: string | null
    whatsapp_templates: unknown
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/loans"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to loans
      </Link>

      <div>
        <h1 className="text-xl font-semibold">New loan</h1>
        <p className="text-sm text-muted-foreground">
          Issue a gold loan. The interest rate is frozen on the loan at
          creation.
        </p>
      </div>
      <LoanForm
        shop={{
          name: details.name,
          phone: details.phone,
          upi_id: details.upi_id,
          interest_mode: shop.interest_mode,
          whatsapp_templates: details.whatsapp_templates,
        }}
      />
    </div>
  )
}
