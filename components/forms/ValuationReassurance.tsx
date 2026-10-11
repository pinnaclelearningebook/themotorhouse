import { Clock, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { PROMISES } from "@/config/site";

/**
 * The panel beside the form.
 *
 * A form is where a seller's doubt arrives — whether the number will
 * hold, who gets their phone number, how long this takes. Every line
 * here is a promise already published on /how-it-works or in the FAQ,
 * restated where the doubt actually happens. Nothing new is offered:
 * a reassurance panel is the easiest place on a site to accidentally
 * write a fifth promise nobody agreed to.
 *
 * It sits under the form on a phone and beside it from lg, so the
 * first thing on a small screen is still the registration input.
 */
const POINTS = [
  {
    icon: Clock,
    title: `A firm offer within ${PROMISES.offerWithinHours} hours`,
    body: "From a person who trades your kind of car, not an algorithm. Late in the evening means first thing the next morning.",
  },
  {
    icon: ShieldCheck,
    title: "The number does not change",
    body: "We do not arrive and start finding deductions. Describe the car honestly and the offer stands for seven days.",
  },
  {
    icon: MapPin,
    title: PROMISES.collection,
    body: "You choose the time and we come to you. No depot, no collection charge.",
  },
  {
    icon: Wallet,
    title: PROMISES.payment,
    body: "The transfer goes while we are still on your drive. Outstanding finance is settled with the lender directly.",
  },
];

export function ValuationReassurance() {
  return (
    <aside
      aria-label="What you can expect"
      className="rounded border border-line bg-paper-warm p-6 md:p-8"
    >
      <p className="text-caption font-semibold tracking-[0.16em] text-oxblood uppercase">
        What happens next
      </p>
      <ul className="mt-7 flex flex-col gap-7">
        {POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <li key={point.title} className="flex gap-4">
              <Icon
                aria-hidden="true"
                size={20}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-oxblood"
              />
              <div>
                <p className="font-medium">{point.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
                  {point.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 border-t border-line pt-6 text-sm leading-relaxed text-ink/70">
        You are under no obligation to accept the offer, and we do not pass
        your details to other buyers.
      </p>
    </aside>
  );
}
