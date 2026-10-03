import { BRAND } from "@/lib/brand"

const FAQS = [
  {
    q: "Do my borrowers need to install anything?",
    a: "No. You send them a WhatsApp message with their passbook link — it opens in any browser. No app, no login for borrowers.",
  },
  {
    q: "Is my shop's data private?",
    a: "Yes. Every shop's data is completely isolated, encrypted in transit and at rest, and only your account can see it. You can export everything anytime.",
  },
  {
    q: "Does it match RBI requirements?",
    a: `${BRAND.name} keeps a complete audit trail, frozen interest rates, and a one-click export of your loan register, payments, and KYC data — designed for RBI 2025 record-keeping standards.`,
  },
  {
    q: "How does WhatsApp messaging work?",
    a: "We build the message with the borrower's balance and passbook link, then open WhatsApp on your phone. You press send — no WhatsApp Business API or approval needed.",
  },
  {
    q: "Does it work offline?",
    a: `No — ${BRAND.name} needs an internet connection. It works on any phone or computer with a browser.`,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There's no lock-in. Export your complete register first if you want it — your data belongs to you.",
  },
] as const

export function MarketingFAQ() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16">
      <h2 className="text-2xl font-semibold sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 divide-y rounded-xl border">
        {FAQS.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
