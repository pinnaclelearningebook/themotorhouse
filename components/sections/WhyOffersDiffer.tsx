import { Section } from "@/components/ui/Section";

/**
 * The reason why — the argument that makes a strong offer believable.
 * Links to /export once that page exists in Milestone 3.
 */
export function WhyOffersDiffer() {
  return (
    <Section ground="ink" labelledBy="why-heading">
      <div className="max-w-3xl">
        <h2 id="why-heading" className="font-display text-display-3">
          Why our offers on certain cars are stronger
        </h2>
        <p className="mt-6 text-paper/80">
          We supply buyers in Cyprus and across the EU who want young,
          high-specification, right-hand-drive premium SUVs. Those markets pay
          more for the right car than a UK retail buyer will.
        </p>
        <p className="mt-4 text-paper/80">
          That demand is why our offer on a young Range Rover, Defender,
          Lexus or Mercedes GLE can beat a general buyer&apos;s — and why we
          collect nationwide for free. It only applies to cars under five
          years old, which is why we&apos;re specific about what we target.
          We still buy everything else, at a fair number.
        </p>
      </div>
    </Section>
  );
}
