"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CircleAlertIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react"

import { inviteStaff, removeStaff } from "@/lib/actions/staff"
import type { StaffRow } from "@/lib/queries/staff"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function StaffManager({
  shopId,
  staff,
}: {
  shopId: string
  staff: StaffRow[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  function onInvite() {
    setError(null)
    startTransition(async () => {
      const res = await inviteStaff(shopId, email)
      if (res.error) {
        setError(res.error)
        return
      }
      toast.success(`Invited ${email.trim()}`)
      setEmail("")
      router.refresh()
    })
  }

  function onRemove(row: StaffRow) {
    const who = row.invited_email ?? "this member"
    if (!window.confirm(`Remove ${who} from the shop?`)) {
      return
    }
    setRemovingId(row.id)
    startTransition(async () => {
      const res = await removeStaff(row.id)
      setRemovingId(null)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`Removed ${who}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Could not invite</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invite form */}
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <Label htmlFor="staff-email">Invite by email</Label>
        <div className="flex gap-2">
          <Input
            id="staff-email"
            type="email"
            placeholder="staff@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) onInvite()
            }}
          />
          <Button
            onClick={onInvite}
            disabled={pending || !email.trim()}
          >
            <UserPlusIcon />
            Invite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          MVP: the invite is stored in the database. The person gains access
          once their account is linked to this invite.
        </p>
      </div>

      {/* Staff list */}
      {staff.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No staff yet — you&apos;re running this shop solo.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((row) => {
              const pending_ = !row.user_id || !row.accepted_at
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.invited_email ??
                      `Member ${row.user_id?.slice(0, 8) ?? ""}…`}
                  </TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>
                    <Badge variant={pending_ ? "outline" : "secondary"}>
                      {pending_ ? "Invite pending" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(row.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => onRemove(row)}
                    >
                      {removingId === row.id ? "…" : <Trash2Icon />}
                      <span className="sr-only">Remove</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
