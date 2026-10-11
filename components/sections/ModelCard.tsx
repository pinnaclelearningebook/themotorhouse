import Link from "next/link";
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
 * CLAUDE.md section 6, both in CSS. Under reduced motion neither
 * happens and only the background changes.
 *
 * A server component again: a card in a grid of eight has no business
 * shipping an animation runtime for a hover state.
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
  const slot = PHOTOGRAPHY.models[slug as ModelSlug];

  return (
    <div className="group h-full bg-paper transition-transform duration-200 ease-(--ease-standard) hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
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
    </div>
  );
}
