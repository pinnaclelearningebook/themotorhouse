import Image from "next/image";
import type { PhotoSlot } from "@/config/photography";

/**
 * One image slot.
 *
 * Renders nothing at all when the slot is empty. That is deliberate: a
 * grey placeholder is a promise of a photograph, and a stock car stood
 * in for a real one is a lie about whose car it is. A section built on
 * this has to look finished without the image, and every section here
 * does.
 */
export function Photo({
  slot,
  className = "",
  sizes,
  quality = 72,
  priority = false,
  children,
}: {
  slot: PhotoSlot;
  className?: string;
  sizes: string;
  /** Lower for anything behind a scrim, where detail is thrown away. */
  quality?: number;
  /**
   * Set on the hero only. It is the LCP element, so it is fetched
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
      width={slot.width ?? 1600}
      height={slot.height ?? 1067}
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      quality={quality}
      className={className}
      style={slot.focal ? { objectPosition: slot.focal } : undefined}
    />
  );
}
