import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { PROMISES } from "@/config/site";

/**
 * Four promises, and not one word that is not already published.
 *
 * Each of these is lifted verbatim from somewhere the site already says
 * it: the offer-doesn't-change commitment from the promise section, and
 * the other three from config/site PROMISES, which the hero and the
 * auto-reply both read. Nothing here is new, because a strip of
 * assurances is exactly where a new claim would slip in unnoticed.
 *
 * One already had. This strip used to say "Same-day payment" while
 * every other surface said payment happens before the transporter
 * leaves — a deadline nobody agreed to, typed in as a literal, on the
 * first page a seller sees. That is why no line here is a string.
 * test/promises.test.ts fails if one becomes one again.
 */
const ASSURANCES: { label: React.ReactNode; detail: string }[] = [
  {
    label: "The offer we make is the offer we pay",
    detail: "No revised number on the driveway.",
  },
  {
    label: (
      <>
        A firm offer within <span className="font-mono">{PROMISES.offerWithinHours}</span>{" "}
        hours
      </>
    ),
    detail: "From a person who knows the model.",
  },
  { label: PROMISES.collection, detail: "At a time that suits you." },
  { label: PROMISES.payment, detail: "You watch it arrive first." },
];

export function AssuranceStrip() {
  return (
    <section aria-label="What you can rely on" className="on-ink bg-ink pb-24 text-paper">
      <Container>
        <ul className="grid gap-px border-t border-line-dark bg-line-dark sm:grid-cols-2 lg:grid-cols-4">
          {ASSURANCES.map((item, index) => (
            <Reveal as="li" key={index} delay={index * 0.07} className="bg-ink pt-7 pr-6">
              <span className="block text-sm font-medium text-paper">
                {item.label}
              </span>
              <span className="mt-2 block text-caption text-paper/55">
                {item.detail}
              </span>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
