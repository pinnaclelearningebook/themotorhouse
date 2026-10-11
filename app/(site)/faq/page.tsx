import type { Metadata } from "next";
import { CtaBand } from "@/components/sections/CtaBand";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { Accordion } from "@/components/ui/Accordion";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FAQ, FAQ_GROUPS } from "@/config/faq";
import { PHOTOGRAPHY } from "@/config/photography";

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

      <PageHero
        eyebrow="Questions"
        heading="Straight answers, including the awkward ones."
        intro="Finance, damage, write-offs, what happens if you change your mind. If yours is not here, ask when we call."
        image={PHOTOGRAPHY.faqInterior}
      />

      {FAQ_GROUPS.map((group, index) => {
        const entries = FAQ.filter((entry) => entry.group === group);
        if (entries.length === 0) return null;
        const id = `faq-${index}`;
        return (
          <Section
            key={group}
            ground={index % 2 === 0 ? "paper" : "paper-warm"}
            labelledBy={id}
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-16">
              <SectionHeader
                id={id}
                eyebrow={`0${index + 1}`}
                heading={group}
                className="lg:sticky lg:top-28 lg:self-start"
              />
              <Accordion
                items={entries.map((entry) => ({
                  question: entry.question,
                  answer: entry.answer ?? (
                    <AwaitingInfo label={entry.pendingLabel ?? "Answer"} />
                  ),
                }))}
              />
            </div>
          </Section>
        );
      })}

      <CtaBand heading="Ready for your number?" />
    </main>
  );
}
