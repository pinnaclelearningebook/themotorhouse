"use client";

import { useEffect } from "react";
import { LazyMotion, domAnimation } from "motion/react";

/**
 * The motion runtime, loaded once and lazily.
 *
 * `domAnimation` through LazyMotion keeps the animation engine out of
 * the first bundle — the `m` components in components/motion/* are tiny
 * on their own, and the engine arrives after the page is interactive.
 * CLAUDE.md section 6 is explicit that mobile performance wins any
 * conflict with motion, and this is the cheapest way to honour it.
 *
 * Lenis is deliberately narrow:
 *
 *   - never under prefers-reduced-motion
 *   - never on a coarse pointer
 *
 * Smooth-scroll hijacking on a phone costs more than it gives: it fights
 * the platform's own scrolling, it delays the first interaction, and for
 * anyone who has asked their system to calm down it is precisely the
 * thing they asked not to have. On a desktop with a mouse wheel it is
 * the difference between a page that feels built and one that does not.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (calm.matches || !fine.matches) return;

    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let frame = 0;
    let cancelled = false;

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 0.9, smoothWheel: true });
      const tick = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);

  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
