import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";
import type { PhotoSlot } from "@/config/photography";

/**
 * The banner every inner page opens with.
 *
 * Eyebrow, heading, one paragraph, and the page's photograph behind an
 * ink scrim. The scrim is not decoration: these are dark images with
 * bright skies in them, and white type over an unscrimmed sky is the
 * single most common way a hero like this fails WCAG.
 *
 * Without an image it falls back to flat ink, which is still a banner
 * and still not a plain heading on paper — the thing the inner pages
 * were criticised for.
 *
 * Nothing here animates from opacity 0. On these pages the hero image
 * or the heading is the largest-contentful element, and section 6 is
 * explicit about that.
 */
export function PageHero({
  eyebrow,
  heading,
  intro,
  image,
  id = "page-heading",
  children,
}: {
  eyebrow: React.ReactNode;
  heading: string;
  intro?: React.ReactNode;
  image?: PhotoSlot;
  id?: string;
  /** A byline, a date, a breadcrumb — whatever the page adds below. */
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="on-ink relative isolate overflow-hidden bg-ink pt-32 pb-14 text-paper md:pt-40 md:pb-20"
    >
      {image?.src && (
        <>
          <Photo
            slot={image}
            priority
            quality={60}
            sizes="100vw"
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/90 to-ink/60"
          />
        </>
      )}
      <Container className="relative z-10">
        <div className="max-w-3xl">
          <p className="text-caption font-semibold tracking-[0.16em] text-paper/70 uppercase">
            {eyebrow}
          </p>
          <h1
            id={id}
            className="rise-in-solid mt-4 font-display text-display-3 md:text-display-2"
          >
            {heading}
          </h1>
          {intro && (
            <p className="rise-in-solid mt-6 max-w-2xl text-lg leading-relaxed text-paper/85">
              {intro}
            </p>
          )}
          {children}
        </div>
      </Container>
    </section>
  );
}
