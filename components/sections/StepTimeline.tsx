import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

export interface Step {
  title: string;
  body: string;
  icon: LucideIcon;
}

/**
 * Numbered steps on a connecting line.
 *
 * The rule runs behind the numerals rather than between the cards, so
 * the four read as one process instead of four boxes. It is drawn with
 * a single absolutely-positioned hairline and the numerals sit on the
 * ground colour to punch through it — which is why the ground has to be
 * passed in rather than inherited.
 */
export function StepTimeline({
  steps,
  ground = "paper",
}: {
  steps: Step[];
  ground?: "paper" | "paper-warm";
}) {
  const punch = ground === "paper" ? "bg-paper" : "bg-paper-warm";

  return (
    <ol className="relative mt-12 grid gap-10 lg:mt-16 lg:grid-cols-4 lg:gap-8">
      <span
        aria-hidden="true"
        className="absolute top-6 left-6 hidden h-px w-[calc(100%-3rem)] bg-line lg:block"
      />
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <Reveal as="li" key={step.title} delay={index * 0.08} className="relative">
            <span
              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line font-mono text-sm text-oxblood ${punch}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <Icon
              aria-hidden="true"
              size={22}
              strokeWidth={1.5}
              className="mt-6 text-oxblood"
            />
            <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
            <p className="mt-3 max-w-prose leading-relaxed text-ink/75">
              {step.body}
            </p>
          </Reveal>
        );
      })}
    </ol>
  );
}
