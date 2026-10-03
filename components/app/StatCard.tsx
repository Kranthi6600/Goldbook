import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: string
  hint?: string
  variant?: "default" | "warning" | "success"
}

export function StatCard({
  label,
  value,
  hint,
  variant = "default",
}: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight",
            variant === "warning" && "text-amber-600 dark:text-amber-400",
            variant === "success" && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
