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

export const stepOneSchema = z.object({
  reg: regSchema,
  mileage: z.coerce
    .number({ error: "Enter the mileage" })
    .int("Enter the mileage in whole miles")
    .min(1, "Enter the mileage")
    .max(500000, "Check the mileage"),
  postcode: postcodeSchema,
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: phoneSchema,
  email: z.email("Enter an email address"),
  /**
   * Only asked when the lookup could not supply a model — DVLA has no
   * model field and MOT history does not exist under ~3 years. Stored
   * against the vehicle, not the lead.
   */
  model: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => value || undefined),
  marketingConsent: z.boolean().default(false),
});

export const stepTwoSchema = z.object({
  financeOutstanding: z.enum(["yes", "no", "unsure"], {
    error: "Tell us about outstanding finance",
  }),
  serviceHistory: z.enum(["full", "partial", "none"], {
    error: "Tell us about the service history",
  }),
  keepers: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .nullish()
    .transform((v) => v ?? null),
  conditionNotes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  sellTimeline: z.enum(
    ["asap", "this-month", "next-few-months", "just-researching"],
    { error: "Tell us when you are looking to sell" },
  ),
});

export type StepOneData = z.infer<typeof stepOneSchema>;
export type StepTwoData = z.infer<typeof stepTwoSchema>;
