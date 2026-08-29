import { Section } from "@/components/ui/Section";
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
    <Section ground="paper-warm" labelledBy="comparison-heading">
      <h2 id="comparison-heading" className="font-display text-display-3">
        Your three ways to sell
      </h2>
      <p className="mt-4 max-w-prose text-structure">
        Each has its place. Here is the honest version of all three.
      </p>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.title}
            className={`rounded border p-8 ${
              column.highlight
                ? "border-oxblood bg-paper"
                : "border-line bg-paper"
            }`}
          >
            <h3 className="text-lg font-medium">{column.title}</h3>
            <ul className="mt-4 space-y-3 text-sm text-structure">
              {column.points.map((point) => (
                <li key={point} className="border-t border-line pt-3">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
