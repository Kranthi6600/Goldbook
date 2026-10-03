import { BRAND } from "@/lib/brand"

const STEPS = [
  {
    n: "01",
    title: "Set up your shop",
    detail:
      "Add your slabs and interest rate once. Every loan afterwards is a 30-second entry.",
  },
  {
    n: "02",
    title: "Issue loans in seconds",
    detail:
      `Weight, purity, amount — ${BRAND.name} computes interest and gives the borrower a digital passbook link.`,
  },
  {
    n: "03",
    title: "Remind & collect",
    detail:
      "See who owes what at a glance. Send WhatsApp reminders in one tap and record payments.",
  },
] as const

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y bg-muted/40"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="text-sm font-bold text-primary">{s.n}</p>
              <h3 className="mt-2 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
