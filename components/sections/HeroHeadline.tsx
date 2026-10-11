/**
 * The hero headline, revealed line by line, with no JavaScript at all.
 *
 * Deliberately a server component. It sits over the largest-contentful
 * element on the site, and the version of this in components/motion
 * waits for hydration before the type is visible — which on a throttled
 * phone is most of a second of an empty hero. The CSS in globals.css
 * does the same thing from the first frame, and respects
 * prefers-reduced-motion in the same stylesheet.
 *
 * Lines are written by hand rather than measured. A line that wraps
 * still animates as one block, so the break is a typographic decision
 * and not a layout risk.
 */
export function HeroHeadline({
  lines,
  id,
  className = "",
}: {
  lines: string[];
  id?: string;
  className?: string;
}) {
  return (
    <h1 id={id} className={className}>
      {lines.map((line, index) => (
        <span key={index} className="mask-line">
          <span style={{ animationDelay: `${index * 80}ms` }}>{line}</span>
        </span>
      ))}
    </h1>
  );
}
