"use client";

import { useInView } from "./useInView";

/**
 * A 24px rise and a fade, once, when the section reaches 20% of the
 * viewport — CLAUDE.md section 6, to the pixel.
 *
 * Transform and opacity only, so it never touches layout, and both in
 * CSS so nothing has to be downloaded before the page can be read.
 *
 * The hidden state is scoped to `[data-js]`, set by an inline script in
 * the root layout. Without scripting the content is simply there:
 * a reveal that depends on JavaScript must never be the reason a
 * paragraph is invisible.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Seconds. Used to stagger siblings; keep the whole set under ~0.3s. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.2);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={`reveal${seen ? " reveal-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${Math.round(delay * 1000)}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
