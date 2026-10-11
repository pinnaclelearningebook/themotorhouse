"use client";

import { m, useReducedMotion } from "motion/react";

/**
 * A headline revealed line by line from behind its own edge.
 *
 * Each line is a clipping box with the text inside it, so the type rises
 * into view rather than fading in — the difference between a page that
 * feels made and one that feels assembled.
 *
 * The viewport trigger is on the clipping box, never on the text inside
 * it. Putting it on the text deadlocks: the text starts translated
 * outside its own `overflow: hidden` parent, so its intersection with
 * the viewport is zero, so it never comes into view, so it never
 * animates, so it stays outside. The headline simply never appears, and
 * it looks like a missing element rather than a stuck animation.
 *
 * Lines are passed in rather than measured, because measuring means
 * rendering the headline, reading its line boxes and re-rendering, which
 * is a layout shift on the largest element on the page. Writing the
 * breaks by hand costs a prop and keeps CLS at zero.
 *
 * Never used on the hero image. The hero image is the LCP element and
 * CLAUDE.md section 6 forbids animating it from opacity 0; the headline
 * over it is fair game.
 */

const LINE = {
  hidden: { y: "110%" },
  shown: { y: "0%" },
};

export function MaskReveal({
  lines,
  className = "",
  id,
  as: Tag = "h1",
  delay = 0,
  onView = false,
}: {
  lines: string[];
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "p";
  delay?: number;
  /**
   * Play when the headline reaches the viewport rather than on mount.
   * Everything below the fold wants this; the hero does not, because by
   * the time a reader scrolls to it the reveal would already be over.
   */
  onView?: boolean;
}) {
  const calm = useReducedMotion();

  if (calm) {
    return (
      <Tag id={id} className={className}>
        {lines.map((line, index) => (
          <span key={index} className="block">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag id={id} className={className}>
      {lines.map((line, index) => (
        <m.span
          key={index}
          // Generous enough for a descender at display sizes, pulled
          // back out again so the leading is untouched.
          className="block overflow-hidden pb-[0.14em] [margin-bottom:-0.14em]"
          initial="hidden"
          {...(onView
            ? { whileInView: "shown", viewport: { once: true, amount: 0.35 } }
            : { animate: "shown" })}
          transition={{
            duration: 0.8,
            delay: delay + index * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <m.span className="block" variants={LINE}>
            {line}
          </m.span>
        </m.span>
      ))}
    </Tag>
  );
}
