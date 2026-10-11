/**
 * The hero headline. A server component, and deliberately the least
 * animated thing on the page.
 *
 * It rises 24px without fading — `rise-in-solid`, which exists in
 * globals.css for exactly this and has done since M1. No mask, no
 * per-line stagger, nothing that holds the type out of view while it
 * arrives.
 *
 * That is not restraint for its own sake. This headline is the
 * largest-contentful element whenever the hero photograph is absent,
 * and a mask reveal holds each line outside its clipping box until the
 * animation runs: measured with the photograph removed, the reveal put
 * LCP at 3.70s against a first paint of 0.9s. Everything below the
 * fold keeps the mask, where the cost is nobody's.
 *
 * Lines are written by hand rather than measured, so the break is a
 * typographic decision and not a layout risk.
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
    <h1 id={id} className={`hero-mask rise-in-solid ${className}`}>
      {lines.map((line, index) => (
        <span key={index} className="mask-line">
          <span>{line}</span>
        </span>
      ))}
    </h1>
  );
}
