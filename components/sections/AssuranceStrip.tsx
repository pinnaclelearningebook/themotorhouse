import { Container } from "@/components/ui/Container";

const assurances = [
  <>
    Firm offer in <span className="font-mono">2</span> hours
  </>,
  <>Free UK collection</>,
  <>Same-day payment</>,
];

export function AssuranceStrip() {
  return (
    <section aria-label="What you can rely on" className="on-ink bg-ink pb-20 text-paper">
      <Container>
        <ul className="flex flex-col gap-4 border-t border-line-dark pt-8 sm:flex-row sm:gap-12">
          {assurances.map((item, index) => (
            <li key={index} className="text-sm tracking-wide text-paper/70">
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
