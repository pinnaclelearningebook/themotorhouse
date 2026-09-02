import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { PlateForm } from "@/components/ui/PlateForm";
import { FAQ } from "@/config/faq";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Outstanding finance, collection, payment timing, damage, write-offs, documents — straight answers on how selling your car to us works.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <main>
      <FaqJsonLd entries={FAQ} />
      <Section ground="paper" labelledBy="faq-heading">
        <div className="max-w-3xl">
          <h1 id="faq-heading" className="font-display text-display-2">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-lg text-structure">
            Straight answers. If yours is not here, ask us when we call.
          </p>
          <dl className="mt-14">
            {FAQ.map((entry) => (
              <div
                key={entry.question}
                className="border-t border-line py-8 first:border-t-0"
              >
                <dt className="font-display text-2xl">{entry.question}</dt>
                <dd className="mt-3 max-w-prose">
                  {entry.answer ?? (
                    <AwaitingInfo label={entry.pendingLabel ?? "Answer"} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
      <Section ground="ink" labelledBy="faq-cta-heading">
        <h2 id="faq-cta-heading" className="font-display text-display-3">
          Ready for your number?
        </h2>
        <div className="mt-8">
          <PlateForm id="faq-reg" />
        </div>
      </Section>
    </main>
  );
}
