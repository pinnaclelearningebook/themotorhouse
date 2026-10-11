import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The standalone "and there is more over here" link.
 *
 * Not an inline link inside a sentence — those stay plain, and the
 * target-size rule exempts them. This is the one that sits on its own
 * under a section, where it is a control a thumb has to find: hence
 * `min-h-11`, which is 44px.
 *
 * The arrow moves on hover and the underline draws, so one component
 * decides what a link of this kind does everywhere rather than five
 * sections each deciding again.
 */
export function TextLink({
  href,
  children,
  tone = "light",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      href={href as never}
      className={`group inline-flex min-h-11 items-center gap-2 font-medium ${
        tone === "dark" ? "text-paper" : "text-oxblood"
      } ${className}`}
    >
      <span className="link-draw">{children}</span>
      <ArrowRight
        aria-hidden="true"
        size={16}
        className="transition-transform duration-200 ease-(--ease-standard) group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
    </Link>
  );
}
