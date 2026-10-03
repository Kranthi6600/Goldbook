"use client"

import { MenuIcon, StoreIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LogoutButton } from "@/components/app/logout-button"

export function AppNav({
  shopName,
  isStaff = false,
}: {
  shopName: string
  isStaff?: boolean
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{shopName}</span>
          {isStaff && (
            <Badge variant="secondary" className="shrink-0">
              Staff
            </Badge>
          )}
        </div>

        <div className="hidden md:block">
          <LogoutButton />
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <MenuIcon />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{shopName}</SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <LogoutButton />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
