import Image from "next/image";
import { LOGO } from "@/config/brand";
import { SITE } from "@/config/site";

/**
 * The brand, wherever it appears on a page.
 *
 * One component for the header and the footer, reading
 * {@link LOGO} — drop a designed logo into `public/brand/`, set the
 * path in config, and both change together along with the icons and
 * the OG cards, which read the same config.
 *
 * The text form is the name in Newsreader with a hairline under it, the
 * way a figure is underscored on a ledger. The rule is part of the
 * wordmark, not decoration: without it the name is just a heading.
 */
export function Logo({
  compact = false,
  className = "",
}: {
  /** The mobile header. Smaller, same proportions. */
  compact?: boolean;
  className?: string;
}) {
  if (LOGO.file) {
    return (
      <span className={className}>
        <Image
          src={LOGO.file}
          alt={SITE.name}
          width={LOGO.width}
          height={LOGO.height}
          priority
          className={compact ? "h-6 w-auto" : "h-8 w-auto"}
        />
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="inline-flex flex-col">
        <span
          className={`font-display leading-none ${compact ? "text-lg" : "text-2xl"}`}
        >
          {SITE.name}
        </span>
        <span
          aria-hidden="true"
          className="mt-1.5 block h-px w-full bg-current opacity-30"
        />
      </span>
    </span>
  );
}
