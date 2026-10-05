/**
 * Single source of truth for all business details.
 * Nothing in here may be invented. Unknown values carry the
 * AWAITING_RESPONSE prefix and a matching line in PENDING-INFO.md.
 */

const AWAITING = "AWAITING_RESPONSE";

/** True while a config value is still a placeholder. */
export function isAwaiting(value: string): boolean {
  return value.startsWith(AWAITING);
}

export const SITE = {
  name: "The Motor House",
  domain: `${AWAITING}: domain name`,
} as const;

/**
 * Absolute base URL, needed for canonicals, the sitemap and OG images.
 * Set NEXT_PUBLIC_SITE_URL once the real domain exists (PENDING-INFO.md).
 * Until then Vercel's own production URL keeps preview and production
 * deployments emitting correct absolute URLs rather than broken ones.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path === "/" ? "" : path}`;
}

/**
 * The only export market we currently supply. Never widen this without
 * evidence (SOURCES.md).
 *
 * Named in exactly three places, and nowhere else:
 *   /export                            the explainer page
 *   the FAQ                            where a seller asks directly
 *   /blog/why-uk-cars-are-exported     the explainer in long form, where
 *                                      naming one checkable market
 *                                      instead of gesturing at a
 *                                      continent IS the argument
 *
 * Everywhere else — home, about, model pages, every other post — the
 * story is told as "export demand" or "the exporters we work with". The
 * site is a general car buying service first, and export is why some
 * offers are strong rather than what the business is about.
 */
export const EXPORT_MARKET = "Cyprus" as const;

export const CONTACT = {
  phone: `${AWAITING}: business phone number`,
  email: `${AWAITING}: business email address`,
  openingHours: `${AWAITING}: opening hours`,
} as const;

export const COMPANY = {
  registeredName: `${AWAITING}: registered company name`,
  companyNumber: `${AWAITING}: company registration number`,
  registeredOffice: `${AWAITING}: registered office address`,
  vatNumber: `${AWAITING}: VAT number, if registered`,
  icoNumber: `${AWAITING}: ICO registration number`,
} as const;

/**
 * The commitments the site makes. These are spec copy, not confirmed
 * operational promises — PENDING-INFO.md tracks confirmation of the
 * two-hour response time before launch.
 */
export const PROMISES = {
  offerWithinHours: 2,
  collection: "Free collection anywhere in mainland UK",
  payment: "Payment before the transporter leaves",
} as const;

/** The models we actively target for the export pipeline. */
export const TARGET_MODELS = [
  "Range Rover",
  "Range Rover Evoque",
  "Range Rover Velar",
  "Discovery Sport",
  "Land Rover Defender",
  "Lexus",
  "Mercedes GLE",
] as const;
