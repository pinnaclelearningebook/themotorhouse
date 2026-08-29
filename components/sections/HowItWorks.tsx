import { Section } from "@/components/ui/Section";

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
    <Section ground="paper" labelledBy="how-heading" className="pt-0">
      <h2 id="how-heading" className="font-display text-display-3">
        How it works
      </h2>
      <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="border-t border-line pt-6">
            <span className="font-mono text-sm text-structure">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
            <p className="mt-2 text-sm text-structure">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
