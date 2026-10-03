"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

export function CustomerSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      const q = value.trim()
      router.replace(
        q ? `/customers?q=${encodeURIComponent(q)}` : "/customers"
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [value, router])

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name or phone"
        className="pl-8"
      />
    </div>
  )
}
