import { Check, Minus, X } from "lucide-react";

export type Verdict = "good" | "bad" | "neutral";

export interface ComparisonPoint {
  verdict: Verdict;
  text: string;
}

const MARKS: Record<Verdict, { Icon: typeof Check; className: string; label: string }> = {
  good: { Icon: Check, className: "text-oxblood", label: "In its favour" },
  bad: { Icon: X, className: "text-structure", label: "Against it" },
  neutral: { Icon: Minus, className: "text-structure", label: "Depends" },
};

/**
 * One of the three ways to sell.
 *
 * The marks are honest rather than flattering: the private sale keeps
 * its tick for the highest headline price, and ours keeps nothing it
 * has not earned. CLAUDE.md section 4, lever 7 — name the alternatives
 * honestly, including the ones that beat us for some sellers — and a
 * comparison table with three ticks in our column and none anywhere
 * else is the exact thing that makes a seller stop believing the page.
 *
 * The verdict is also written out for assistive tech, because a tick
 * and a cross are the entire meaning of the row and colour alone
 * cannot carry it.
 */
export function ComparisonCard({
  title,
  points,
  ours = false,
}: {
  title: string;
  points: ComparisonPoint[];
  /** Highlighted, with the tag. One card only. */
  ours?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded border p-6 md:p-8 ${
        ours
          ? "border-oxblood border-t-2 bg-paper shadow-[0_1px_20px_rgba(92,26,31,0.06)]"
          : "border-line bg-paper"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-2xl">{title}</h3>
        {ours && (
          <span className="shrink-0 rounded-full bg-oxblood px-3 py-1 text-caption font-medium tracking-wide text-paper uppercase">
            Our way
          </span>
        )}
      </div>
      <ul className="mt-6 space-y-4">
        {points.map((point) => {
          const { Icon, className, label } = MARKS[point.verdict];
          return (
            <li key={point.text} className="flex gap-3 border-t border-line pt-4">
              <Icon
                aria-hidden="true"
                size={18}
                strokeWidth={2}
                className={`mt-0.5 shrink-0 ${className}`}
              />
              <span className="text-sm leading-relaxed text-ink/80">
                <span className="sr-only">{label}: </span>
                {point.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
