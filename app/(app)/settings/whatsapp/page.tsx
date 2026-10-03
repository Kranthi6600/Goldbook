import { redirect } from "next/navigation"

import { getCurrentShop, getShopSettings } from "@/lib/queries/shops"
import { mergeWithDefaults } from "@/lib/utils/template"
import { WhatsappTemplateEditor } from "@/components/app/WhatsappTemplateEditor"

export default async function WhatsappSettingsPage() {
  const shop = await getCurrentShop()
  if (!shop) {
    redirect("/onboarding")
  }
  // Owner-only — settings layout already gates, this is belt & braces.
  if (shop.role !== "owner") {
    redirect("/")
  }

  const settings = await getShopSettings(shop.id)
  if (!settings) {
    redirect("/")
  }

  const templates = mergeWithDefaults(settings.whatsapp_templates)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-medium">WhatsApp templates</h2>
        <p className="text-sm text-muted-foreground">
          Customize the messages sent to borrowers via wa.me links. All money
          figures come from SQL — templates only control wording.
        </p>
      </div>
      <WhatsappTemplateEditor
        shopId={shop.id}
        initialTemplates={templates}
      />
    </div>
  )
}
