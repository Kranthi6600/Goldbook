import { BRAND } from "@/lib/brand"

export function ROICallout() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
        One missed payment{" "}
        <span className="text-primary">pays for a year</span> of {BRAND.name}.
      </p>
      <p className="mt-4 text-muted-foreground">
        A single forgotten reminder on a ₹50,000 pledge can cost you more in
        lost interest than our whole year costs. The maths pays for itself.
      </p>
    </section>
  )
}
