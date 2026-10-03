"use client"

import { useEffect } from "react"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <Alert variant="destructive" className="max-w-md">
        <CircleAlertIcon />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          The dashboard failed to load. Please try again.
        </AlertDescription>
      </Alert>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
