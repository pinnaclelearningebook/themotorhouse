import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Accordion } from "@/components/ui/Accordion";
import { FAQ } from "@/config/faq";

/**
 * The four questions people ask first, answered here rather than made
 * into a reason to click. The full set is on /faq, where the FAQPage
 * schema lives — this teaser deliberately emits none, so the same
 * answers are not published twice to a search engine.
 */
export function FaqTeaser() {
  // Entries awaiting a business decision carry a null answer and render
  // nowhere. A teaser is the last place to show a question we cannot
  // answer yet.
  const questions = FAQ.filter(
    (entry): entry is typeof entry & { answer: string } => Boolean(entry.answer),
  ).slice(0, 4);
  if (questions.length === 0) return null;

  return (
    <Section ground="paper-warm" labelledBy="faq-teaser-heading">
      <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
        <SectionHeader
          eyebrow="Asked first"
          id="faq-teaser-heading"
          heading="Before you type a registration"
          className="lg:max-w-none"
        />
        <div>
          <Accordion
            items={questions.map((entry) => ({
              question: entry.question,
              answer: entry.answer,
            }))}
          />
          <p className="mt-8">
            <Link href="/faq" className="link-draw font-medium text-oxblood">
              Every question
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
