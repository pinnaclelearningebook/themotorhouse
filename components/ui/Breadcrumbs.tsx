import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

export interface Crumb {
  name: string;
  path: string;
}

/**
 * The visible breadcrumb trail, and the schema that describes it.
 *
 * One component for both, because the two drifting apart is the usual
 * failure: BreadcrumbList markup describing a trail no reader can see
 * is the kind of structured data Google calls out for not matching
 * the page. Pass the trail once and they cannot disagree.
 *
 * The current page is the last crumb and is not a link — it is where
 * the reader already is, and a link to here is a dead control.
 *
 * It sits inside the dark page banner on most pages, so the colours
 * are tuned for ink. `tone="light"` is for the few that open on paper.
 */
export function Breadcrumbs({
  trail,
  tone = "dark",
  className = "",
}: {
  /** Everything after Home, in order. The last entry is this page. */
  trail: Crumb[];
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  const muted = dark ? "text-paper/60" : "text-structure";
  const current = dark ? "text-paper/85" : "text-ink/80";

  return (
    <>
      <BreadcrumbJsonLd trail={trail} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption">
          <li>
            <Link
              href="/"
              className={`${muted} transition-colors duration-200 hover:${dark ? "text-paper" : "text-oxblood"}`}
            >
              Home
            </Link>
          </li>
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1.5">
                <ChevronRight
                  aria-hidden="true"
                  size={12}
                  className={muted}
                  strokeWidth={2}
                />
                {last ? (
                  <span className={current} aria-current="page">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.path as never}
                    className={`${muted} transition-colors duration-200 hover:${dark ? "text-paper" : "text-oxblood"}`}
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
