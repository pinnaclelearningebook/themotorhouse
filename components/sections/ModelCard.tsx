"use client";

import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { Photo } from "@/components/ui/Photo";
import { PHOTOGRAPHY, type ModelSlug } from "@/config/photography";

/**
 * One model.
 *
 * The image slot is wired and empty. Until there is a photograph of a
 * car we actually bought it stays empty, and the card is typographic —
 * which is both the honest answer and the better-looking one. A licensed
 * photograph of somebody else's Velar under the word "Velar" is a claim
 * about whose car it is, and the first seller to notice stops believing
 * the rest of the page.
 *
 * The hover is a 2px lift and a rule drawing left to right, per
 * CLAUDE.md section 6. Under reduced motion neither happens and the
 * border simply changes colour.
 */
export function ModelCard({
  slug,
  name,
  href,
}: {
  slug: string;
  name: string;
  href?: string;
}) {
  const calm = useReducedMotion();
  const slot = PHOTOGRAPHY.models[slug as ModelSlug];

  return (
    <m.div
      whileHover={calm ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group h-full bg-paper"
    >
      <Link
        href={(href ?? `/${slug}`) as never}
        className="flex h-full flex-col justify-between gap-10 p-7 transition-colors duration-200 hover:bg-paper-warm"
      >
        {slot?.src && (
          <Photo
            slot={slot}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[4/3] w-full object-cover"
          />
        )}
        <span className="font-display text-2xl">{name}</span>
        <span className="block">
          <span className="block text-caption font-medium tracking-wide text-oxblood uppercase">
            Get my offer
          </span>
          <span
            aria-hidden="true"
            className="mt-2 block h-px w-8 origin-left bg-oxblood transition-transform duration-300 ease-(--ease-standard) group-hover:scale-x-[3.5] motion-reduce:transition-none motion-reduce:group-hover:scale-x-100"
          />
        </span>
      </Link>
    </m.div>
  );
}
