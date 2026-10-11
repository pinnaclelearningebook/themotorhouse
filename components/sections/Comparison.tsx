import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import {
  ComparisonCard,
  type ComparisonPoint,
} from "@/components/sections/ComparisonCard";
import { SITE } from "@/config/site";

/**
 * The three ways to sell, described honestly. Competitors are unnamed —
 * the experience is described and recognition does the work.
 *
 * The marks are not a scoreboard. The private sale keeps its tick for
 * the highest headline price and we do not get one for it, because
 * that is true and a reader selling a rare car knows it. CLAUDE.md
 * section 4, lever 7.
 */
const COLUMNS: { title: string; ours?: boolean; points: ComparisonPoint[] }[] = [
  {
    title: "Private sale",
    points: [
      { verdict: "good", text: "Usually the highest headline price" },
      { verdict: "bad", text: "Weeks of listings, messages and timewasters" },
      { verdict: "bad", text: "Strangers and test drives at your house" },
      { verdict: "bad", text: "Payment fraud risk on handover" },
    ],
  },
  {
    title: "Part-exchange",
    points: [
      { verdict: "good", text: "The easiest route by far" },
      { verdict: "good", text: "One visit, everything handled" },
      { verdict: "bad", text: "The trade-in figure carries the dealer's margin" },
      { verdict: "neutral", text: "Works best when you're buying from them anyway" },
    ],
  },
  {
    title: SITE.name,
    ours: true,
    points: [
      { verdict: "good", text: "A firm offer within two hours" },
      { verdict: "good", text: "The number doesn't change on collection" },
      { verdict: "good", text: "Free collection anywhere in mainland UK" },
      { verdict: "good", text: "Paid in full before the car leaves your drive" },
    ],
  },
];

export function Comparison() {
  return (
    <Section ground="paper" labelledBy="comparison-heading">
      <SectionHeader
        eyebrow="Honestly"
        id="comparison-heading"
        heading="Your three ways to sell"
        intro="Each has its place, and one of them beats us for some sellers. Here is the honest version of all three."
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((column, index) => (
          <Reveal key={column.title} delay={index * 0.08}>
            <ComparisonCard {...column} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
