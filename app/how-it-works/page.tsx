import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { PlateForm } from "@/components/ui/PlateForm";
import { PROMISES } from "@/config/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Tell us about the car, get a firm offer within two hours, free collection anywhere in mainland UK, payment before the transporter leaves.",
};

const steps = [
  {
    title: "Tell us about the car",
    body: "Start with your registration and mileage, and how to reach you. It takes about a minute, and you can add detail afterwards — service history, condition, anything you would want a buyer to know. The more you tell us, the firmer the ground under the number we give you.",
  },
  {
    title: "A firm offer within two hours",
    body: "A person who trades your kind of car calls you with a number. Not an estimate, not a range, not a figure that gets revisited later — the amount we will pay. The offer stands for seven days, provided the mileage has not materially increased and the condition is as you described.",
  },
  {
    title: "We collect, free, anywhere in mainland UK",
    body: "You choose the time and we come to you. There is no dropping the car at a depot and no collection charge, wherever you are on the mainland. Handover usually takes under half an hour: documents, keys, done.",
  },
  {
    title: "Paid before the transporter leaves",
    body: "The full amount goes to your account by bank transfer while we are still on your drive. You watch it arrive before the car goes anywhere. If there is outstanding finance we settle the lender directly and pay you the balance.",
  },
];

export default function HowItWorksPage() {
  return (
    <main>
      <Section ground="paper" labelledBy="how-heading">
        <div className="max-w-3xl">
          <h1 id="how-heading" className="font-display text-display-3">
            How it works
          </h1>
          <p className="mt-4 text-lg text-structure">
            Four steps, no surprises at any of them.
          </p>
          <ol className="mt-14">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="border-t border-line py-10 first:border-t-0"
              >
                <span className="font-mono text-sm text-structure">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-display text-2xl">{step.title}</h2>
                <p className="mt-3 max-w-prose">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* The no-deductions policy: its own block, largest type on the page. */}
      <Section ground="paper-warm" labelledBy="policy-heading">
        <div className="max-w-4xl">
          <p className="text-sm font-medium tracking-wide text-ink/70 uppercase">
            The part that matters
          </p>
          <h2
            id="policy-heading"
            className="mt-4 font-display text-display-3 md:text-display-2"
          >
            No deductions. Not at collection, not ever.
          </h2>
          <p className="mt-6 max-w-prose text-lg">
            The industry habit is an attractive number online and a smaller
            one on the day. We do not work that way. Describe the car
            honestly and the offer we make is the amount that lands in your
            account — if we misjudged something you told us about truthfully,
            we absorb it.
          </p>
        </div>
      </Section>

      <Section ground="ink" labelledBy="how-cta-heading">
        <h2 id="how-cta-heading" className="font-display text-display-3">
          Start with your registration.
        </h2>
        <p className="mt-4 text-paper/80">
          A firm offer within {PROMISES.offerWithinHours} hours. No
          obligation to accept it.
        </p>
        <div className="mt-8">
          <PlateForm id="how-reg" />
        </div>
      </Section>
    </main>
  );
}
