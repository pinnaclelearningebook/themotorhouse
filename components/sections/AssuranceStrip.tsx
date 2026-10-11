import { Container } from "@/components/ui/Container";
import { PROMISES } from "@/config/site";

/**
 * Three promises, and not one word that is not already published.
 *
 * Every line reads from config/site PROMISES, which the hero, the
 * how-it-works page and the seller auto-reply all read too. Nothing is
 * retyped here, because a strip of short assurances is exactly where a
 * new claim slips in unnoticed — and one had. It said "Same-day
 * payment" while every other surface said payment happens before the
 * transporter leaves. Those are different promises: one is a deadline
 * we have never agreed to and the other is a sequence we control, and
 * the stricter-sounding one was on the home page.
 *
 * test/promises.test.ts fails if a claim here is a literal rather than
 * a constant, and if "same-day payment" reappears anywhere.
 */
const ASSURANCES: React.ReactNode[] = [
  <>
    Firm offer within{" "}
    <span className="font-mono">{PROMISES.offerWithinHours}</span> hours
  </>,
  PROMISES.collection,
  PROMISES.payment,
];

export function AssuranceStrip() {
  return (
    <section aria-label="What you can rely on" className="on-ink bg-ink pb-20 text-paper">
      <Container>
        <ul className="flex flex-col gap-4 border-t border-line-dark pt-8 sm:flex-row sm:gap-12">
          {ASSURANCES.map((item, index) => (
            <li key={index} className="text-sm tracking-wide text-paper/70">
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
