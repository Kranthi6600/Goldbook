import { ShieldAlertIcon } from "lucide-react"

import {
  getPassbookData,
  logPassbookView,
} from "@/lib/queries/passbook"
import { PassbookView } from "@/components/passbook/PassbookView"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Security note: no IP rate limiting yet — no KV/store in this project.
// Before public launch at scale, add one (e.g. Vercel KV or a Supabase-backed
// counter). Token guessing is mitigated today only by UUID entropy (122 bits).

export default async function PassbookPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const data = await getPassbookData(token)

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-muted p-2">
                <ShieldAlertIcon className="size-5 text-muted-foreground" />
              </div>
              <CardTitle>Link expired or invalid</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This passbook link is no longer valid. It may have expired or been
              revoked. Please ask your pawnshop to send you a new link.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Fire-and-forget view logging — never block rendering on analytics.
  void logPassbookView(token)

  return <PassbookView data={data} />
}
