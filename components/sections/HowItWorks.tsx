import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Four steps as a timeline: a hairline running through the numbers, each
 * step rising in as it reaches the viewport.
 *
 * The rule is drawn with a pseudo-element on the list rather than a
 * border on each item, so the line is continuous across the row on
 * desktop and down the column on a phone, and so the numbers sit on it
 * rather than beside it.
 */
const steps = [
  {
    title: "Tell us about the car",
    body: "Registration, mileage, and how to reach you. It takes about a minute.",
  },
  {
    title: "A firm offer within two hours",
    body: "A person who knows your model calls with a number that doesn't move.",
  },
  {
    title: "We collect, free",
    body: "Anywhere in mainland UK, at a time that suits you. No dropping the car at a retail park.",
  },
  {
    title: "Paid before the car leaves",
    body: "The money is in your account before the transporter pulls away.",
  },
];

export function HowItWorks() {
  return (
    <Section ground="paper" labelledBy="how-heading">
      <Reveal>
        <p className="text-caption font-medium tracking-[0.14em] text-structure uppercase">
          Start to finish
        </p>
        <h2 id="how-heading" className="mt-4 font-display text-display-3">
          How it works
        </h2>
      </Reveal>

      <ol className="relative mt-16 grid gap-12 lg:grid-cols-4 lg:gap-8">
        <span
          aria-hidden="true"
          className="absolute top-[13px] left-[13px] hidden h-px w-full bg-line lg:block"
        />
        {steps.map((step, index) => (
          <Reveal as="li" key={step.title} delay={index * 0.08} className="relative">
            <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper font-mono text-caption text-structure">
              {index + 1}
            </span>
            <h3 className="mt-6 font-display text-2xl">{step.title}</h3>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-structure">
              {step.body}
            </p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
