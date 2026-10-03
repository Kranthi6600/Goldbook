"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "due_soon", label: "Due Soon" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed" },
] as const

export function LoanFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = searchParams.get("status") ?? "all"
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const firstRender = useRef(true)

  function replaceParams(next: URLSearchParams) {
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function setStatus(value: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (value === "all") next.delete("status")
    else next.set("status", value)
    next.delete("page")
    replaceParams(next)
  }

  // Debounced search — resets page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString())
      const q = query.trim()
      if (q) next.set("q", q)
      else next.delete("q")
      next.delete("page")
      replaceParams(next)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const active = status === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search loan # or customer"
          className="pl-8"
        />
      </div>
    </div>
  )
}
