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
