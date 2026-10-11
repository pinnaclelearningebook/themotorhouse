import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { Photo } from "@/components/ui/Photo";
import { PHOTOGRAPHY } from "@/config/photography";

/**
 * The reason why — the argument that makes a strong offer believable.
 * Names no destination: the market is identified only on /export.
 * Never widen the underlying claim without evidence (SOURCES.md).
 */
export function WhyOffersDiffer() {
  return (
    <Section ground="ink" labelledBy="why-heading">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] lg:gap-16">
        <div>
          <SectionHeader
            tone="dark"
            eyebrow="The reason why"
            id="why-heading"
            heading="Why our offers on certain cars are stronger"
          />
          <Reveal delay={0.1}>
            <p className="mt-7 max-w-prose text-lg leading-relaxed text-paper/85">
              We buy cars of every kind. On a minority of them — young,
              well-specified models — we also sell to exporters we work with,
              supplying a market where right-hand drive is the local standard
              rather than an oddity.
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-paper/70">
              That export demand is why our offer on a young Range Rover,
              Defender, Lexus or Mercedes GLE can beat a general buyer&apos;s.
              It is the exception rather than the rule: most of what we buy is
              bought, prepared and sold here, at a fair number priced against
              the UK trade.
            </p>
            <p className="mt-8">
              <Link
                href="/export"
                className="inline-flex items-center gap-2 font-medium text-paper"
              >
                <span className="link-draw">
                  The full reason, and where your car lands
                </span>
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="hidden self-center lg:block">
          <Photo
            slot={PHOTOGRAPHY.collection}
            sizes="(min-width: 1024px) 36vw, 100vw"
            className="aspect-4/3 w-full rounded object-cover"
          />
        </Reveal>
      </div>
    </Section>
  );
}
