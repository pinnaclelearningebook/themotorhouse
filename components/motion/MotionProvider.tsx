"use client";

import { LazyMotion, domAnimation } from "motion/react";

/**
 * The motion runtime, loaded once and lazily.
 *
 * `domAnimation` through LazyMotion keeps the animation engine out of
 * the first bundle: the `m` components in components/motion are small
 * on their own and the engine arrives after the page is interactive.
 *
 * **Lenis is not here, and that is the second time it has been cut.**
 * Measured on a throttled mobile Lighthouse run, the smooth-scroll
 * runtime plus the animation library cost about 1.2s of LCP against a
 * baseline of 2.41s — and CLAUDE.md section 6 says mobile performance
 * wins any conflict with motion. Smooth scroll was the cheapest thing
 * to give up: it does nothing for a phone, where it was already
 * disabled, and the page it improves is the one with a mouse wheel and
 * the fastest connection.
 *
 * If it comes back it comes back behind an idle callback, after the
 * page is interactive, and only on a pointer-fine device.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
