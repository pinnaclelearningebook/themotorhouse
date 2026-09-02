import Link from "next/link";
import { Section } from "@/components/ui/Section";

/**
 * The reason why — the argument that makes a strong offer believable.
 * Cyprus only. Never widen this claim without evidence (SOURCES.md).
 */
export function WhyOffersDiffer() {
  return (
    <Section ground="ink" labelledBy="why-heading">
      <div className="max-w-3xl">
        <h2 id="why-heading" className="font-display text-display-3">
          Why our offers on certain cars are stronger
        </h2>
        <p className="mt-6 text-paper/80">
          We supply buyers in Cyprus, where traffic drives on the left and
          right-hand-drive cars are the local standard. The island imports
          most of what it drives, and the UK is one of the main sources —
          our cars are already the right way round.
        </p>
        <p className="mt-4 text-paper/80">
          That demand is why our offer on a young Range Rover, Defender,
          Lexus or Mercedes GLE can beat a general buyer&apos;s. It only
          applies to cars under five years old, which is why we are specific
          about what we target. We still buy everything else, at a fair
          number priced against the UK trade.
        </p>
        <p className="mt-6">
          <Link href="/export" className="link-draw font-medium text-paper">
            The full reason, and where your car lands
          </Link>
        </p>
      </div>
    </Section>
  );
}
