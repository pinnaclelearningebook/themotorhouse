import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORY_LABELS, type Category, type Post } from "@/lib/blog";

/**
 * A guide, as a card.
 *
 * A coloured header band instead of an image, because there is no
 * photography and a grey rectangle announcing its absence would be
 * worse than either. The band is a flat ground from the palette, keyed
 * off the category, so an index of twelve reads as sorted without
 * needing a legend.
 *
 * Read time is set in the body face, not mono. Mono is for vehicle data
 * — a registration, a mileage, a price — and using it for "6 min" makes
 * a reading estimate look like a measurement (CLAUDE.md section 5).
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

  return (
    <Link
      href={`/blog/${post.slug}` as never}
      className="group flex h-full flex-col overflow-hidden rounded border border-line bg-paper transition-[transform,border-color] duration-200 ease-(--ease-standard) hover:-translate-y-0.5 hover:border-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span
        className={`flex h-20 items-end px-5 pb-4 ${BANDS[post.category]}`}
      >
        <span
          className={`rounded-full px-3 py-1 text-caption font-medium tracking-wide uppercase ${
            dark
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
