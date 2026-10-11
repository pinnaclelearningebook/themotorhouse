/**
 * Every image slot on the site, in one place.
 *
 * A slot with `src: null` renders nothing — no grey box, no placeholder
 * car, no "image coming soon". Dropping a real photograph in means
 * adding the file and changing one line here, which is the whole point:
 * when Alex photographs a car we actually bought, nobody has to go
 * hunting through components for where it goes.
 *
 * Licensed imagery is logged in SOURCES.md as it lands, per CLAUDE.md
 * section 15. Nothing in here shows a car we bought, our premises or our
 * people, and nothing on the site says or implies otherwise.
 */

export interface PhotoSlot {
  /** Public path, or null while the slot is empty. */
  src: string | null;
  /**
   * What the image is, for a reader who cannot see it. Never a claim —
   * "a dark car bodywork in the rain", not "a Range Rover we bought".
   */
  alt: string;
  /** CSS object-position, when the subject is off-centre. */
  focal?: string;
  /** Intrinsic size, so next/image can reserve the space. */
  width?: number;
  height?: number;
}

const empty = (alt: string): PhotoSlot => ({ src: null, alt });

export const PHOTOGRAPHY = {
  /** Home hero. Sits behind an ink scrim; it is texture, not a subject. */
  homeHero: {
    src: "/photography/hero-wet-bodywork.jpg",
    alt: "Rain beaded on the dark bodywork of a car at night",
    focal: "60% 45%",
    width: 1600,
    height: 1067,
  },
  /** The export band. */
  exportBand: {
    src: "/photography/detail-water-on-paint.jpg",
    alt: "Water on dark paintwork, caught in low light",
    focal: "35% 50%",
    width: 1600,
    height: 1067,
  },

  /* ─── waiting on real photography ─────────────────────────────────── */

  /** Four steps, four photographs. See PENDING-INFO.md for the shot list. */
  howItWorks: [
    empty("A registration being entered on a phone"),
    empty("A car being looked over on a driveway"),
    empty("Keys and a V5C changing hands"),
    empty("A car being loaded onto a transporter"),
  ],
  /** One per model card. Typography carries them until these exist. */
  models: {
    "sell-my-range-rover": empty("A Range Rover we bought"),
    "sell-my-range-rover-evoque": empty("A Range Rover Evoque we bought"),
    "sell-my-range-rover-velar": empty("A Range Rover Velar we bought"),
    "sell-my-discovery-sport": empty("A Discovery Sport we bought"),
    "sell-my-land-rover-defender": empty("A Land Rover Defender we bought"),
    "sell-my-lexus": empty("A Lexus we bought"),
    "sell-my-mercedes-gle": empty("A Mercedes GLE we bought"),
  },
  /** Alex, once there is a photograph and permission to use it. */
  about: empty("Alex, who prices the cars"),
} as const;

export type ModelSlug = keyof typeof PHOTOGRAPHY.models;
