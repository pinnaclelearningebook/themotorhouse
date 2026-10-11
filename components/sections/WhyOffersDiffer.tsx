import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/motion/Reveal";
import { MaskReveal } from "@/components/motion/MaskReveal";
import { PHOTOGRAPHY } from "@/config/photography";

/**
 * The reason why — the argument that makes a strong offer believable.
 * Names no destination: the market is identified only on /export.
 * Never widen the underlying claim without evidence (SOURCES.md).
 *
 * The photograph is abstract and behind a scrim for the same reason as
 * the hero: it is mood, not evidence, and it must not read as a car of
 * ours.
 */
export function WhyOffersDiffer() {
  return (
    <section
      aria-labelledby="why-heading"
      className="on-ink relative isolate overflow-hidden bg-ink py-24 text-paper md:py-32"
    >
      <Photo
        slot={PHOTOGRAPHY.exportBand}
        sizes="100vw"
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-50"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/92 to-ink/60"
      />
      <Container className="relative z-10">
        <div className="max-w-3xl">
          <Reveal>
            <p className="text-caption font-medium tracking-[0.14em] text-paper/50 uppercase">
              The reason why
            </p>
          </Reveal>
          <MaskReveal
            as="h2"
            id="why-heading"
            delay={0.05}
            lines={["Why our offers on", "certain cars are stronger"]}
            className="mt-4 font-display text-display-3"
          />
          <Reveal delay={0.15}>
            <p className="mt-7 text-lg text-paper/80">
              We buy cars of every kind. On a minority of them — young,
              well-specified models — we also sell to exporters we work with,
              supplying a market where right-hand drive is the local standard
              rather than an oddity.
            </p>
            <p className="mt-4 text-paper/70">
              That export demand is why our offer on a young Range Rover,
              Defender, Lexus or Mercedes GLE can beat a general buyer&apos;s.
              It is the exception rather than the rule: most of what we buy is
              bought, prepared and sold here, at a fair number priced against
              the UK trade.
            </p>
            <p className="mt-8">
              <Link href="/export" className="link-draw font-medium text-paper">
                The full reason, and where your car lands
              </Link>
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
