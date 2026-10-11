/**
 * The logo, in one place, with a slot for the real one.
 *
 * Everything that draws the brand — the header, the footer, the
 * favicon, the app icon and every OG card — reads from here. When the
 * designed logo arrives it is one file into `public/brand/` and one
 * line below, and all six surfaces change together. Nothing else needs
 * touching.
 *
 * Until then the wordmark is live text in Newsreader, which is not a
 * placeholder so much as a legitimate answer: a name set well in the
 * display face is a wordmark, and it scales with the reader's type
 * size in a way a fixed image never will.
 */
export const LOGO = {
  /**
   * Path under `public/`, e.g. "/brand/the-motor-house.svg". Null means
   * the text wordmark is used everywhere.
   */
  file: null as string | null,
  /** Intrinsic size of that file, for layout. Ignored while it is null. */
  width: 280,
  height: 40,
} as const;
