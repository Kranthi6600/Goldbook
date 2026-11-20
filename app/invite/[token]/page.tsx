"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CircleAlertIcon, CheckCircleIcon } from "lucide-react"

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Redirect to login with return URL
          router.push(`/login?redirect=/invite/${params.token}`)
          return
        }

        const { error } = await supabase.rpc("accept_staff_invite", {
          p_invite_token: params.token,
        })

        if (error) {
          setError(error.message)
          setStatus("error")
        } else {
          setStatus("success")
          setTimeout(() => router.push("/"), 2000)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to accept invite")
        setStatus("error")
      }
    }

    acceptInvite()
  }, [params.token, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Accepting Invitation...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please wait while we process your invitation.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircleIcon className="text-green-500" />
              Invitation Accepted!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You've successfully joined the shop. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleAlertIcon className="text-red-500" />
            Invitation Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.push("/")} 
            className="mt-4 w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
