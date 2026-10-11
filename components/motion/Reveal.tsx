"use client";

import { m, useReducedMotion } from "motion/react";

/**
 * A 24px rise and a fade, once, when the section reaches 20% of the
 * viewport — CLAUDE.md section 6, to the pixel.
 *
 * Transform and opacity only, so it never touches layout. Under reduced
 * motion the element is simply there: not a shorter animation, none.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  /** Seconds. Used to stagger siblings; keep the whole set under ~0.3s. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const calm = useReducedMotion();
  const Tag = m[as];

  if (calm) return <div className={className}>{children}</div>;

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
