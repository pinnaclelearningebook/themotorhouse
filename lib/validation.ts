import { z } from "zod";

/**
 * Shared between the client (pre-submit checks) and the server actions
 * (authoritative validation). Import from here on both sides — never
 * duplicate a rule.
 */

// Permissive on format: current, prefix, suffix and dateless plates all
// pass. Strict format policing loses real leads over edge-case plates.
const regSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9 ]{2,10}$/, "Enter your registration")
  .transform((v) => v.replace(/\s+/g, " "));

const postcodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, "Enter a UK postcode");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d ()-]{10,16}$/, "Enter a phone number we can reach you on");

/**
 * The four-step form, split so each step can persist on its own.
 *
 * A lead exists from the moment the car is confirmed and a phone number
 * lands (CLAUDE.md section 9). Steps 2, 3 and 4 patch that same row, so
 * abandoning part-way still leaves a lead someone can act on.
 */

/** Step 1 — creates the lead. The smallest row worth having. */
export const startLeadSchema = z.object({
  reg: regSchema,
  phone: phoneSchema,
  /** Only when the lookup could not supply a model. */
  model: z.string().trim().max(60).optional(),
});

/** Step 2 — the car. */
export const carSchema = z.object({
  mileage: z.coerce
    .number({ error: "Enter the mileage" })
    .int("Enter the mileage in whole miles")
    .min(1, "Enter the mileage")
    .max(500000, "Check the mileage")
    .nullish(),
  serviceHistory: z.enum(["full", "partial", "none"]).nullish(),
  keepers: z.coerce.number().int().min(1).max(30).nullish(),
  condition: z
    .record(
      z.string(),
      z.object({
        grade: z.enum(["good", "fair", "poor"]),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .nullish(),
  warningLights: z.string().trim().max(500).nullish(),
  knownFaults: z.string().trim().max(2000).nullish(),
  modifications: z.string().trim().max(500).nullish(),
});

/** Step 3 — the sale. Timeline is the one required answer. */
export const saleSchema = z.object({
  reasonForSale: z.string().trim().max(1000).nullish(),
  timeline: z.enum(["asap", "this_month", "few_months", "researching"], {
    error: "Tell us when you are looking to sell",
  }),
  financeOutstanding: z.enum(["yes", "no", "unsure"]).nullish(),
  settlementKnown: z.boolean().nullish(),
  partExchangeInterest: z.boolean().nullish(),
  /** Operator context only. Never echoed to the seller, never scored. */
  fairPrice: z.coerce.number().int().positive().max(1_000_000).nullish(),
  othersApproached: z.string().trim().max(1000).nullish(),
});

/** Step 4 — you. Phone already landed at step 1. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.email("Enter an email address"),
  postcode: postcodeSchema,
  contactWindow: z.string().trim().max(120).nullish(),
  marketingConsent: z.boolean().default(false),
});

export type StartLeadData = z.infer<typeof startLeadSchema>;
export type CarData = z.infer<typeof carSchema>;
export type SaleData = z.infer<typeof saleSchema>;
export type ContactData = z.infer<typeof contactSchema>;
