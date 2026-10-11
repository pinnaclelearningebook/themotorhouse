import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { Photo } from "@/components/ui/Photo";
import { PHOTOGRAPHY } from "@/config/photography";
import { TextLink } from "@/components/ui/TextLink";

/**
 * The reason why — the argument that makes a strong offer believable.
 * Names no destination: the market is identified only on /export.
 * Never widen the underlying claim without evidence (SOURCES.md).
 *
 * The photograph bleeds to the right edge of the viewport and
 * dissolves into the ink, the way the hero does. It used to be a
 * rounded box floating in the right-hand column, which is a slide
 * layout: a picture of a car with a border round it, sitting on a
 * dark ground, announcing that it is an illustration. Taking the
 * frame off is most of the difference between a section that looks
 * designed and one that looks assembled.
 *
 * Built without `Section`, deliberately. Section wraps its children
 * in a Container, and a full-bleed image cannot live inside a 1200px
 * box — so the section element is written out here and only the text
 * goes in a Container. The ground and the padding scale still match
 * Section exactly; if that scale changes, change it here too.
 *
 * It is below the fold, so the image is lazy and never `priority`.
 * Neither copy of it can shift the layout: the phone's is in flow
 * with a fixed aspect ratio, and the desktop one is absolute.
 */
export function WhyOffersDiffer() {
  return (
    <section
      aria-labelledby="why-heading"
      className="on-ink relative isolate overflow-hidden bg-ink text-paper"
    >
      {/*
       * The phone. Above the text, full width, fading down into the
       * ink so the paragraph starts on solid ground rather than on a
       * photograph. The scrim is bottom-weighted because here the
       * type is underneath it, not beside it.
       */}
      <div className="relative lg:hidden">
        <Photo
          slot={PHOTOGRAPHY.collection}
          sizes="100vw"
          quality={60}
          className="aspect-[16/11] w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,20,15,0.20)_0%,rgba(18,20,15,0.62)_55%,#12140F_100%)]"
        />
      </div>

      {/*
       * Everything from lg up. 58% of the viewport, hard against the
       * right edge, full height of the section. The gradient starts
       * at solid ink — the same colour as the ground it sits on — so
       * the left edge of the image has nothing to give it away.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block"
      >
        <Photo
          slot={PHOTOGRAPHY.collection}
          sizes="58vw"
          quality={60}
          className="h-full w-full object-cover"
        />
        {/*
         * Explicit stops, not `from-ink via-ink/75`. Tailwind puts
         * `via` at the midpoint and starts easing immediately, so
         * opacity had already dropped a few pixels in and the left
         * edge of the image read as a faint vertical seam against the
         * solid ink beside it. Holding full ink for the first fifth
         * is what makes the join invisible.
         */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#12140F_0%,#12140F_20%,rgba(18,20,15,0.74)_55%,rgba(18,20,15,0.22)_100%)]" />
      </div>

      <Container className="relative z-10 py-16 md:py-24">
        <div className="lg:max-w-[46%]">
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
              <TextLink href="/export" tone="dark">
                The full reason, and where your car lands
              </TextLink>
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
