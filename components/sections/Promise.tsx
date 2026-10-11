import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { MaskReveal } from "@/components/motion/MaskReveal";

/**
 * The commitment, as a statement moment.
 *
 * The one oxblood band on the site. It is the primary message in
 * CLAUDE.md section 4 — certainty over optimism — and it gets the only
 * ground nothing else is allowed to use, because a colour spent twice
 * is a colour that means nothing.
 */
export function OfferPromise() {
  return (
    <Section ground="oxblood" labelledBy="promise-heading">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="text-caption font-semibold tracking-[0.16em] text-paper/70 uppercase">
            Our commitment
          </p>
        </Reveal>
        <MaskReveal
          as="h2"
          id="promise-heading"
          delay={0.05}
          lines={["The offer we make", "is the offer we pay."]}
          className="mt-6 font-display text-display-3 md:text-display-2"
        />
        <Reveal delay={0.15}>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-paper/85">
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
