import Link from "next/link";
import { Section } from "@/components/ui/Section";

/**
 * The reason why — the argument that makes a strong offer believable.
 * Names no destination: the market is identified only on /export.
 * Never widen the underlying claim without evidence (SOURCES.md).
 */
export function WhyOffersDiffer() {
  return (
    <Section ground="ink" labelledBy="why-heading">
      <div className="max-w-3xl">
        <h2 id="why-heading" className="font-display text-display-3">
          Why our offers on certain cars are stronger
        </h2>
        <p className="mt-6 text-paper/80">
          We buy any car. On a minority of them — young, well-specified
          models — we also sell to exporters we work with, supplying a
          market where right-hand drive is the local standard rather than
          an oddity.
        </p>
        <p className="mt-4 text-paper/80">
          That export demand is why our offer on a young Range Rover,
          Defender, Lexus or Mercedes GLE can beat a general buyer&apos;s.
          It is the exception rather than the rule: most of what we buy is
          bought, prepared and sold here, at a fair number priced against
          the UK trade.
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
