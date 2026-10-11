import Image from "next/image";
import type { PhotoSlot } from "@/config/photography";

/**
 * One image slot.
 *
 * Renders nothing at all when the slot is empty. That is deliberate: a
 * grey placeholder is a promise of a photograph, and a picture stood
 * in for a real one is a claim about whose car it is. A section built
 * on this has to look finished without the image, and every section
 * here does.
 *
 * Blur placeholders come from config/blur — twelve pixels inlined in
 * the HTML, so a slow connection gets the tone of the page rather
 * than a hole in it.
 */
export function Photo({
  slot,
  className = "",
  sizes,
  quality = 70,
  priority = false,
  children,
}: {
  slot: PhotoSlot;
  className?: string;
  sizes: string;
  quality?: number;
  /**
   * Set on a page's hero only. It is the LCP element, so it is fetched
   * eagerly and never animated from opacity 0 (CLAUDE.md section 6).
   */
  priority?: boolean;
  /** Shown instead when the slot is empty. */
  children?: React.ReactNode;
}) {
  if (!slot.src) return <>{children ?? null}</>;

  return (
    <Image
      src={slot.src}
      alt={slot.alt}
      width={slot.width}
      height={slot.height}
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      quality={quality}
      placeholder={slot.blur ? "blur" : "empty"}
      blurDataURL={slot.blur}
      className={className}
      style={slot.focal ? { objectPosition: slot.focal } : undefined}
    />
  );
}
