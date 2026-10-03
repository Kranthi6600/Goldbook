// Verbatim pain points from the product doc — do not paraphrase.
const PAINS = [
  "I can't find a customer's record quickly when they come to redeem.",
  "I'm not sure if I calculated the interest correctly — if I made a mistake, the customer will argue.",
  "Customers forget to pay on time. I have to call each one.",
  "I don't have proof of what was agreed if there's a dispute.",
] as const

export function PainPoints() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Sound familiar?
        </h2>
        <p className="mt-2 text-muted-foreground">
          What pawnbrokers tell us, in their own words.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PAINS.map((quote) => (
            <figure
              key={quote}
              className="rounded-xl border bg-background p-5"
            >
              <blockquote className="text-sm font-medium leading-relaxed">
                “{quote}”
              </blockquote>
              <figcaption className="mt-3 text-xs text-muted-foreground">
                — Pawnbroker, Coimbatore
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
