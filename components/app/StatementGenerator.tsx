"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CircleAlertIcon,
  DownloadIcon,
  FileTextIcon,
  PlayIcon,
} from "lucide-react"

import {
  generateCustomerStatement,
  generateShopStatement,
} from "@/lib/actions/statements"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type CustomerOption = { id: string; name: string; phone: string }

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function firstOfMonth(): string {
  const d = new Date()
  return isoDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function StatementGenerator({
  shopId,
  customers,
  initialCustomerId,
}: {
  shopId: string
  customers: CustomerOption[]
  initialCustomerId?: string
}) {
  const [customerId, setCustomerId] = useState(
    initialCustomerId ?? customers[0]?.id ?? ""
  )
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(isoDay(new Date()))
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState("statement.pdf")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<"customer" | "shop">(
    initialCustomerId ? "customer" : "shop"
  )

  const datesValid = from <= to

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  function generate() {
    setError(null)
    clearPreview()
    startTransition(async () => {
      const res =
        mode === "customer"
          ? await generateCustomerStatement(customerId, from, to)
          : await generateShopStatement(shopId, from, to)

      if (res.error || !res.base64) {
        setError(res.error ?? "Could not generate statement.")
        return
      }

      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: "application/pdf" })
      setPreviewUrl(URL.createObjectURL(blob))
      setFilename(res.filename ?? "statement.pdf")
    })
  }

  function download() {
    if (!previewUrl) return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = filename
    a.click()
    toast.success("Statement downloaded")
  }

  const controls = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stmt-from">From</Label>
        <Input
          id="stmt-from"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            clearPreview()
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stmt-to">To</Label>
        <Input
          id="stmt-to"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            clearPreview()
          }}
        />
      </div>
      <Button
        onClick={generate}
        disabled={
          pending ||
          !datesValid ||
          (mode === "customer" && !customerId)
        }
      >
        <PlayIcon />
        {pending ? "Generating…" : "Generate preview"}
      </Button>
      {previewUrl && (
        <Button variant="outline" onClick={download}>
          <DownloadIcon />
          Download PDF
        </Button>
      )}
      {!datesValid && (
        <p className="text-xs text-destructive">
          Start date must be on or before end date.
        </p>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as "customer" | "shop")
          clearPreview()
        }}
      >
        <TabsList>
          <TabsTrigger value="customer">By Customer</TabsTrigger>
          <TabsTrigger value="shop">By Shop</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="flex flex-col gap-4">
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor="stmt-customer">Customer</Label>
            <select
              id="stmt-customer"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                clearPreview()
              }}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No customers yet — create one first.
              </p>
            )}
          </div>
          {controls}
        </TabsContent>

        <TabsContent value="shop" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Every loan in the period, sorted by due date.
          </p>
          {controls}
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Could not generate statement</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {previewUrl ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileTextIcon className="size-4" />
              Preview — {filename}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              src={previewUrl}
              title="Statement preview"
              className="h-[70vh] w-full rounded-md border"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Pick a range and generate — the PDF preview appears here.
        </div>
      )}
    </div>
  )
}
