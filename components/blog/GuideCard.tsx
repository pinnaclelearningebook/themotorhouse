import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { PHOTOGRAPHY } from "@/config/photography";
import { CATEGORY_LABELS, type Category, type Post } from "@/lib/blog";

/**
 * A guide, as a card.
 *
 * The header is the category's photograph. It used to be a flat band
 * from the palette, because there was no photography and a grey
 * rectangle announcing its absence would have been worse than either;
 * the bands are kept as the fallback, so a category whose slot is
 * empty still reads as sorted rather than broken.
 *
 * The image is illustrative and generated — it is the subject of the
 * category, never a car we bought. Its alt text is empty here: the
 * card's own title says what the link is, and a scene description
 * repeated twelve times down an index is noise to a screen reader.
 *
 * Read time is set in the body face, not mono. Mono is for vehicle
 * data — a registration, a mileage, a price — and using it for "6 min"
 * makes a reading estimate look like a measurement (CLAUDE.md §5).
 */
const BANDS: Record<Category, string> = {
  valuations: "bg-paper-warm",
  "selling-guides": "bg-ink-soft",
  "model-guides": "bg-oxblood",
  "market-insight": "bg-ink",
  ownership: "bg-paper-warm",
};

/** Which bands are dark, so the pill flips rather than disappears. */
const DARK: Category[] = ["selling-guides", "model-guides", "market-insight"];

export function GuideCard({ post }: { post: Post }) {
  const dark = DARK.includes(post.category);
  const image = PHOTOGRAPHY.guides[post.category];

  return (
    <Link
      href={`/blog/${post.slug}` as never}
      className="group flex h-full flex-col overflow-hidden rounded border border-line bg-paper transition-[transform,border-color] duration-200 ease-(--ease-standard) hover:-translate-y-0.5 hover:border-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span
        className={`relative flex h-36 items-end overflow-hidden px-5 pb-4 ${BANDS[post.category]}`}
      >
        {image?.src && (
          <>
            <Photo
              slot={{ ...image, alt: "" }}
              sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
              quality={60}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-(--ease-standard) group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink/75 to-ink/10"
            />
          </>
        )}
        <span
          className={`relative rounded-full px-3 py-1 text-caption font-medium tracking-wide uppercase ${
            image?.src
              ? "bg-paper/15 text-paper backdrop-blur-sm"
              : dark
                ? "bg-paper/15 text-paper"
                : "border border-line bg-paper text-oxblood"
          }`}
        >
          {CATEGORY_LABELS[post.category]}
        </span>
      </span>
      <span className="flex flex-1 flex-col p-6">
        <span className="font-display text-xl leading-snug">{post.title}</span>
        <span className="mt-3 flex-1 text-sm leading-relaxed text-ink/75">
          {post.description}
        </span>
        <span className="mt-5 flex items-center gap-2 text-caption text-ink/65">
          {post.readingMinutes} min read
          <ArrowRight
            aria-hidden="true"
            size={14}
            className="text-oxblood transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        </span>
      </span>
    </Link>
  );
}
