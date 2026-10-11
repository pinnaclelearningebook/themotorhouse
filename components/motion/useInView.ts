"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Has this element reached the viewport yet? Once true, always true.
 *
 * An IntersectionObserver and nothing else. The animation library this
 * replaced was 70KB in the first bundle and cost about a second of LCP
 * on a throttled phone, for fades and rises that CSS does natively —
 * and CLAUDE.md section 6 says mobile performance wins any conflict
 * with motion.
 *
 * Fails open: no IntersectionObserver, no observation, content visible.
 */
export function useInView<T extends HTMLElement>(amount = 0.2) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      // Reveal everything on the next frame rather than synchronously
      // in the effect: the state has to change, but not during render's
      // commit, where it would be a second pass for nothing.
      const frame = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: amount },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [amount, seen]);

  return [ref, seen] as const;
}
