import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { MaskReveal } from "@/components/motion/MaskReveal";

/**
 * The offer-doesn't-change commitment as a standalone statement.
 * Largest type on the page after the hero.
 */
export function OfferPromise() {
  return (
    <Section ground="paper" labelledBy="promise-heading">
      <div className="max-w-4xl">
        <Reveal>
          <p className="text-caption font-medium tracking-[0.14em] text-structure uppercase">
            Our commitment
          </p>
        </Reveal>
        <MaskReveal
          as="h2"
          id="promise-heading"
          delay={0.05}
          lines={["The offer we make", "is the offer we pay."]}
          className="mt-5 font-display text-display-3 md:text-display-2"
        />
        <Reveal delay={0.15} className="mt-7 max-w-prose text-lg">
          <p>
          No revised number when the transporter arrives. No deductions found
          on the driveway. If something about the car surprises us, that is
          our problem, not yours — you told us what you knew, and the figure
            stands.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
