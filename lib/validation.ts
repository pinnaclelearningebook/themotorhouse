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
 * The four-step form. Steps 2 and 3 are held client-side until step 4,
 * because a lead needs a confirmed registration AND contact details to
 * exist (CLAUDE.md section 9). The whole thing is validated server-side
 * in one call when step 4 submits.
 */
export const leadSchema = z.object({
  // Step 1 — identify
  reg: regSchema,
  model: z.string().trim().max(60).optional(),

  // Step 2 — the car
  mileage: z.coerce
    .number({ error: "Enter the mileage" })
    .int("Enter the mileage in whole miles")
    .min(1, "Enter the mileage")
    .max(500000, "Check the mileage"),
  serviceHistory: z.enum(["full", "partial", "none"]).nullish(),
  keepers: z.coerce.number().int().min(1).max(30).nullish(),
  condition: z.record(z.string(), z.object({
    grade: z.enum(["good", "fair", "poor"]),
    note: z.string().trim().max(500).optional(),
  })).nullish(),
  warningLights: z.string().trim().max(500).nullish(),
  knownFaults: z.string().trim().max(2000).nullish(),
  modifications: z.string().trim().max(500).nullish(),

  // Step 3 — the sale
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

  // Step 4 — you
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: phoneSchema,
  email: z.email("Enter an email address"),
  postcode: postcodeSchema,
  contactWindow: z.string().trim().max(120).nullish(),
  marketingConsent: z.boolean().default(false),
});

export type LeadData = z.infer<typeof leadSchema>;
