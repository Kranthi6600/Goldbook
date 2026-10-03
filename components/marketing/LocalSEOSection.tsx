import { MapPinIcon } from "lucide-react"

const CITIES = ["Coimbatore", "Madurai", "Rajkot"] as const

/**
 * Local SEO section — seed for per-city landing pages
 * (e.g. /gold-loan-software-coimbatore). Expanded in a future prompt; for now
 * it renders the pilot cities honestly, without invented claims.
 */
export function LocalSEOSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="rounded-xl border bg-muted/40 px-5 py-6 text-center">
        <p className="text-sm font-medium">Built for pawnbrokers across India</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {CITIES.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground"
            >
              <MapPinIcon className="size-3" />
              {city}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Starting with gold-loan hubs in Tamil Nadu and Gujarat — more cities
          on the way.
        </p>
      </div>
    </section>
  )
}
