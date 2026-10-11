"use client";

import { useInView } from "./useInView";

/**
 * A headline revealed line by line from behind its own edge, below the
 * fold.
 *
 * The hero has its own copy of this in globals.css with no JavaScript
 * at all, because it is over the largest-contentful element. This one
 * waits for the viewport, so it can afford an observer.
 *
 * The trigger is on the clipping box, never on the text inside it.
 * Putting it on the text deadlocks: the text starts translated outside
 * its own `overflow: hidden` parent, so its intersection with the
 * viewport is zero, so it never comes into view, so it never animates.
 * The headline simply never appears.
 *
 * Lines are passed in rather than measured, because measuring means
 * rendering the headline, reading its line boxes and re-rendering,
 * which is a layout shift on a large element. Writing the breaks by
 * hand costs a prop and keeps CLS at zero.
 */
export function MaskReveal({
  lines,
  className = "",
  id,
  as: Tag = "h2",
  delay = 0,
}: {
  lines: string[];
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "p";
  delay?: number;
}) {
  const [ref, seen] = useInView<HTMLHeadingElement>(0.35);

  return (
    <Tag id={id} className={className} ref={ref as React.Ref<HTMLHeadingElement>}>
      {lines.map((line, index) => (
        <span key={index} className="mask-line">
          <span
            className={seen ? "mask-line-in" : undefined}
            style={{ animationDelay: `${Math.round(delay * 1000) + index * 80}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
