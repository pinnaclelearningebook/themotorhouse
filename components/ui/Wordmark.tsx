import { Arch } from "@/components/ui/Arch";
import { SITE } from "@/config/site";

/**
 * The lockup: the arch, then the name with a rule drawn under it.
 *
 * The arch's threshold and the wordmark's rule sit on the same baseline,
 * so the two halves read as one object rather than a logo with a picture
 * stuck to it. The oxblood is the threshold only; the rule under the
 * name is a hairline, the way a figure is underscored on a ledger.
 *
 * Set in HTML rather than as one flat SVG on purpose. The name is live
 * text in Newsreader, so it reflows, scales with the user's type size
 * and is selectable and readable to a screen reader. The icon set is
 * where a fixed SVG belongs, and that is generated from {@link Arch}
 * alone.
 *
 * No tagline. "We buy any car" is a competitor's registered trademark —
 * see test/trademark.test.ts, which fails if it reappears anywhere.
 */
export function Wordmark({
  compact = false,
  className = "",
}: {
  /** The mobile header. Smaller arch, smaller name, same proportions. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-end gap-2.5 ${className}`}>
      <Arch size={compact ? 24 : 30} className="shrink-0 translate-y-px" />
      <span className="inline-flex flex-col">
        <span
          className={`font-display leading-none ${compact ? "text-lg" : "text-2xl"}`}
        >
          {SITE.name}
        </span>
        <span
          aria-hidden="true"
          className="mt-1.5 block h-px w-full bg-current opacity-30"
        />
      </span>
    </span>
  );
}
