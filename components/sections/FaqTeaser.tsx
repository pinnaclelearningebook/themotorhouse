import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
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
    <Section ground="paper" labelledBy="faq-teaser-heading">
      <div className="grid gap-12 lg:grid-cols-[22rem_1fr] lg:gap-20">
        <Reveal>
          <h2 id="faq-teaser-heading" className="font-display text-display-3">
            Asked first
          </h2>
          <p className="mt-5 max-w-prose text-structure">
            The things most people want settled before they type a
            registration in.
          </p>
          <p className="mt-6">
            <Link href="/faq" className="link-draw font-medium text-oxblood">
              Every question
            </Link>
          </p>
        </Reveal>

        <ul className="border-t border-line">
          {questions.map((entry, index) => (
            <Reveal
              as="li"
              key={entry.question}
              delay={index * 0.06}
              className="border-b border-line py-7"
            >
              <h3 className="font-display text-xl">{entry.question}</h3>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-structure">
                {entry.answer}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
