"use client"

import { useTransition } from "react"
import { LogOutIcon } from "lucide-react"

import { signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await signOut()
        })
      }}
    >
      <LogOutIcon />
      {pending ? "Signing out…" : "Log out"}
    </Button>
  )
}
