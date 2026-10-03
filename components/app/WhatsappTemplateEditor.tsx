"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { RotateCcwIcon, SaveIcon } from "lucide-react"

import { updateWhatsappTemplates } from "@/lib/actions/settings"
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  SAMPLE_VARS,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_PLACEHOLDERS,
  type WhatsAppTemplates,
} from "@/lib/utils/template"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CircleAlertIcon } from "lucide-react"

type FormValues = { templates: WhatsAppTemplates }

export function WhatsappTemplateEditor({
  shopId,
  initialTemplates,
}: {
  shopId: string
  /** Templates already merged with defaults on the server. */
  initialTemplates: WhatsAppTemplates
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    defaultValues: { templates: initialTemplates },
  })

  // Live preview needs every keystroke — watch the whole map.
  const templates = form.watch("templates")

  function onSubmit(values: FormValues) {
    setError(null)
    startTransition(async () => {
      const res = await updateWhatsappTemplates(shopId, values.templates)
      if (res.error) {
        setError(res.error)
        return
      }
      toast.success("Templates saved")
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Could not save templates</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Placeholders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Type these into any template — they&apos;re replaced with real
            values when the message is built. Unknown placeholders stay
            visible in the sent message so typos are obvious.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATE_PLACEHOLDERS.map((p) => (
              <code
                key={p}
                className="rounded bg-muted px-1.5 py-0.5 text-xs"
              >
                {`{{${p}}}`}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>

      {TEMPLATE_KEYS.map((key) => {
        const current = templates[key] ?? ""
        return (
          <Card key={key} size="sm">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">
                {TEMPLATE_LABELS[key]}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  form.setValue(`templates.${key}`, DEFAULT_TEMPLATES[key], {
                    shouldDirty: true,
                  })
                }
                disabled={current === DEFAULT_TEMPLATES[key]}
              >
                <RotateCcwIcon />
                Reset to default
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`tpl-${key}`}>Template</Label>
                <Textarea
                  id={`tpl-${key}`}
                  rows={8}
                  className="font-mono text-xs"
                  {...form.register(`templates.${key}`)}
                />
                <p className="text-xs text-muted-foreground">
                  {current.length}/1000
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Live preview</Label>
                <div className="min-h-40 whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                  {renderTemplate(current, {
                    ...SAMPLE_VARS,
                    shop_name: SAMPLE_VARS.shop_name,
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <SaveIcon />
          {pending ? "Saving…" : "Save all templates"}
        </Button>
      </div>
    </form>
  )
}
