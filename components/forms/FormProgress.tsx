/**
 * Where the seller is in the form, and how much is left.
 *
 * Four stops, because CLAUDE.md section 9 has four steps. The first
 * is the registration and nothing else, which is the whole argument
 * for it being first — contact details all live on the last one.
 *
 * It is a list rather than a bar: a bar implies a percentage, and the
 * steps are not the same length. The current step is named in full and
 * the rest are numbered, so a phone at 375px shows one label instead
 * of four truncated ones.
 *
 * The numerals are in the body face. Mono is for vehicle data — a
 * registration, a mileage, a price — and a step counter set in it
 * reads as a measurement of the car (CLAUDE.md section 5).
 */
export const FORM_STEPS = ["Your reg", "The car", "The sale", "Contact"] as const;

export type FormStepName = (typeof FORM_STEPS)[number];

export function FormProgress({ current }: { current: number }) {
  return (
    <nav aria-label="Progress" className="mb-10">
      <p className="sr-only">
        Step {current + 1} of {FORM_STEPS.length}: {FORM_STEPS[current]}
      </p>
      <ol className="flex items-center gap-2" aria-hidden="true">
        {FORM_STEPS.map((label, index) => {
          const done = index < current;
          const here = index === current;
          return (
            <li key={label} className="flex flex-1 flex-col gap-2">
              <span
                className={`block h-0.5 rounded-full transition-colors duration-300 ${
                  done || here ? "bg-oxblood" : "bg-line"
                }`}
              />
              <span
                className={`block text-caption tracking-wide whitespace-nowrap uppercase ${
                  here ? "font-semibold text-oxblood" : "text-structure"
                }`}
              >
                <span>{index + 1}</span>
                <span className={here ? "ml-2" : "sr-only"}>{label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
