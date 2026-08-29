import { Section } from "@/components/ui/Section";

/**
 * The offer-doesn't-change commitment as a standalone statement.
 * Largest type on the page after the hero.
 */
export function OfferPromise() {
  return (
    <Section ground="paper" labelledBy="promise-heading">
      <div className="max-w-4xl">
        <p className="text-sm font-medium tracking-wide text-structure uppercase">
          Our commitment
        </p>
        <h2
          id="promise-heading"
          className="mt-4 font-display text-display-3 md:text-display-2"
        >
          The offer we make is the offer we pay.
        </h2>
        <p className="mt-6 max-w-prose text-lg">
          No revised number when the transporter arrives. No deductions found
          on the driveway. If something about the car surprises us, that is
          our problem, not yours — you told us what you knew, and the figure
          stands.
        </p>
      </div>
    </Section>
  );
}
