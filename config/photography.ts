import { BLUR } from "@/config/blur";

/**
 * Every image slot on the site, in one place.
 *
 * A slot with `src: null` renders nothing — no grey box, no
 * placeholder car, no "image coming soon". Dropping a real photograph
 * in means adding the file, running `npm run blur` and changing one
 * line here.
 *
 * **Everything here is AI-generated and illustrative.** None of these
 * is a car we bought, our premises or our people, and no alt text may
 * say or imply otherwise — see SOURCES.md and CLAUDE.md section 5. Alt
 * text describes the scene and nothing else: "a dark estate car on a
 * gravel driveway", never "a Range Rover we bought".
 */

export interface PhotoSlot {
  /** Public path, or null while the slot is empty. */
  src: string | null;
  /**
   * What the image is, for a reader who cannot see it. Never a claim.
   */
  alt: string;
  /** CSS object-position, when the subject is off-centre. */
  focal?: string;
  width: number;
  height: number;
  /** Inline preview, from config/blur. */
  blur?: string;
}

const LANDSCAPE = { width: 1536, height: 1024 } as const;
const WIDE = { width: 1672, height: 941 } as const;
const SQUARE = { width: 1254, height: 1254 } as const;

export const PHOTOGRAPHY = {
  /** Home hero. Behind a scrim; the headline has to stay legible. */
  homeHero: {
    src: "/photography/hero-home.jpg",
    alt: "A dark estate car parked on a wet gravel driveway in front of a brick country house, under an overcast sky",
    focal: "60% 55%",
    blur: BLUR["hero-home"],
    ...LANDSCAPE,
  },
  /** The final call to action. */
  ctaDusk: {
    src: "/photography/cta-dusk.jpg",
    alt: "A dark estate car on a gravel drive at dusk, with lit windows behind it",
    focal: "60% 50%",
    blur: BLUR["cta-dusk"],
    ...WIDE,
  },
  /** How it works, and the promise. */
  handover: {
    src: "/photography/handover.jpg",
    alt: "A car key passing from one hand to another over the bonnet of a dark car",
    blur: BLUR["handover"],
    ...LANDSCAPE,
  },
  paperwork: {
    src: "/photography/paperwork.jpg",
    alt: "A leather folder, two car keys, a pen and a wallet of documents on a dark desk",
    blur: BLUR["paperwork"],
    ...LANDSCAPE,
  },
  collection: {
    src: "/photography/collection.jpg",
    alt: "A dark estate car being loaded onto an enclosed transporter on a residential street at dusk",
    blur: BLUR["collection"],
    ...LANDSCAPE,
  },
  /** Page heroes. */
  exportCoast: {
    src: "/photography/export-coast.jpg",
    alt: "A dark estate car on a coastal road above the sea, driving on the left-hand side",
    /*
     * High in the frame. A page banner is a wide, shallow crop, and at
     * 55% this image gave it a band of black bonnet and black tarmac —
     * a hero that looked like a rendering failure. 22% catches the
     * car's upper body, the hillside and the water behind it.
     */
    focal: "60% 22%",
    blur: BLUR["export-coast"],
    ...LANDSCAPE,
  },
  aboutRoad: {
    src: "/photography/about-road.jpg",
    alt: "A single car on a country road above a lake, with dry stone walls and hills beyond",
    focal: "60% 60%",
    blur: BLUR["about-road"],
    ...WIDE,
  },
  faqInterior: {
    src: "/photography/faq-interior.jpg",
    alt: "The interior of a right-hand drive car, looking across the steering wheel to open countryside",
    focal: "55% 50%",
    blur: BLUR["faq-interior"],
    ...LANDSCAPE,
  },

  /** One per blog category, for cards and post headers. */
  guides: {
    valuations: {
      src: "/photography/guide-valuations.jpg",
      alt: "A car's instrument dials, close up, with countryside through the windscreen",
      blur: BLUR["guide-valuations"],
      ...SQUARE,
    },
    "selling-guides": {
      src: "/photography/guide-selling.jpg",
      alt: "A car key and a wallet of papers on a desk, between two people's hands",
      blur: BLUR["guide-selling"],
      ...SQUARE,
    },
    "model-guides": {
      src: "/photography/guide-models.jpg",
      alt: "Three estate cars seen from above in marked parking bays",
      blur: BLUR["guide-models"],
      ...SQUARE,
    },
    "market-insight": {
      src: "/photography/guide-market.jpg",
      alt: "A row of parked estate cars outside a modern building, under a grey sky",
      blur: BLUR["guide-market"],
      ...SQUARE,
    },
    ownership: {
      src: "/photography/guide-ownership.jpg",
      alt: "A hand drying the wing of a dark car with a cloth",
      blur: BLUR["guide-ownership"],
      ...SQUARE,
    },
  },

  /* ─── deliberately empty ──────────────────────────────────────────── */

  /**
   * Model cards and the mega-menu stay typographic. A photograph of
   * somebody else's Velar under the word "Velar" is a claim about
   * whose car it is, and these are generated images of cars that do
   * not exist.
   */
  models: null,
  /** Alex, once there is a photograph and permission to use it. */
  about: { src: null, alt: "Alex, who prices the cars", width: 1, height: 1 },
} as const;
