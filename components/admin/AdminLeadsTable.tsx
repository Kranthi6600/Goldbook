"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { SearchIcon } from "lucide-react"

import type { AdminLead } from "@/lib/queries/admin"
import { LeadStatusSelect } from "@/components/admin/LeadStatusSelect"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function AdminLeadsTable({ leads }: { leads: AdminLead[] }) {
  const [query, setQuery] = useState("")

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leads
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.shop_name ?? "").toLowerCase().includes(q) ||
        (l.city ?? "").toLowerCase().includes(q) ||
        l.phone.includes(q)
    )
  }, [leads, query])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, shop, city, phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-64 pl-8 text-xs"
          />
        </div>
        {visible.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No leads match “{query.trim()}”.
          </span>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Pledges</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.name}</TableCell>
              <TableCell>{l.shop_name ?? "—"}</TableCell>
              <TableCell>{l.city ?? "—"}</TableCell>
              <TableCell>{l.phone}</TableCell>
              <TableCell className="text-muted-foreground">
                {l.active_pledges ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {l.current_method ?? "—"}
              </TableCell>
              <TableCell>{format(new Date(l.created_at), "dd MMM")}</TableCell>
              <TableCell>
                <LeadStatusSelect leadId={l.id} status={l.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
