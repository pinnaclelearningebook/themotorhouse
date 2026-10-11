import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { SITE } from "@/config/site";

/**
 * The three ways to sell, described honestly. Competitors are unnamed —
 * the experience is described and recognition does the work.
 */
const columns = [
  {
    title: "Private sale",
    points: [
      "Usually the highest headline price",
      "Weeks of listings, messages and timewasters",
      "Strangers and test drives at your house",
      "Payment fraud risk on handover",
    ],
  },
  {
    title: "Part-exchange",
    points: [
      "The easiest route by far",
      "One visit, everything handled",
      "The trade-in figure carries the dealer's margin",
      "Works best when you're buying from them anyway",
    ],
  },
  {
    title: SITE.name,
    points: [
      "A firm offer within two hours",
      "The number doesn't change on collection",
      "Free collection anywhere in mainland UK",
      "Paid in full before the car leaves your drive",
    ],
    highlight: true,
  },
];

export function Comparison() {
  return (
    <Section ground="paper" labelledBy="comparison-heading">
      <Reveal>
        <p className="text-caption font-medium tracking-[0.14em] text-structure uppercase">
          Honestly
        </p>
        <h2 id="comparison-heading" className="mt-4 font-display text-display-3">
          Your three ways to sell
        </h2>
        <p className="mt-5 max-w-prose text-lg">
          Each has its place, and one of them beats us for some sellers.
          Here is the honest version of all three.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-px bg-line lg:grid-cols-3">
        {columns.map((column, index) => (
          <Reveal
            key={column.title}
            delay={index * 0.08}
            className={`p-8 ${column.highlight ? "bg-paper-warm" : "bg-paper"}`}
          >
            <h3 className="font-display text-2xl">{column.title}</h3>
            {column.highlight && (
              <span
                aria-hidden="true"
                className="mt-3 block h-0.5 w-10 bg-oxblood"
              />
            )}
            <ul className="mt-6 space-y-4 text-sm leading-relaxed text-structure">
              {column.points.map((point) => (
                <li key={point} className="border-t border-line pt-4">
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
