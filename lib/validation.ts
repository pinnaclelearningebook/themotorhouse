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
 * A lead exists from the moment the car is confirmed (CLAUDE.md
 * section 9). Steps 2, 3 and 4 patch that same row. Contact details
 * all arrive at step 4, so a row created at confirmation has nobody to
 * ring until then — see the note on startLeadSchema.
 */

/**
 * Step 1 — creates the lead. A registration and nothing else.
 *
 * The phone number used to be here, which made every row actionable
 * and made the first step two questions instead of one. It is at step
 * 4 now (owner's decision, 15 October 2026), so this row is a record
 * that somebody confirmed a car, not a lead anyone can call.
 */
export const startLeadSchema = z.object({
  reg: regSchema,
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

export const CONTACT_METHODS = ["call", "whatsapp", "sms", "email"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

/**
 * Step 4 — how to reach you. Every contact detail arrives here.
 *
 * **The phone number is required whichever method they pick.** The
 * published promise is that a person rings with the offer, so a lead
 * without a number is a lead we cannot keep that promise on. Choosing
 * WhatsApp or email changes which channel we open with, not whether we
 * can call.
 *
 * Email is required only when they ask to be emailed, and optional
 * otherwise — it is for a copy of the enquiry, which is a convenience,
 * not something to withhold the offer over.
 */
export const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(100),
    preferredContactMethod: z.enum(CONTACT_METHODS, {
      error: "Choose how you would like us to contact you",
    }),
    phone: phoneSchema,
    /**
     * Blank is a legitimate answer, so the empty string collapses to
     * null here rather than failing a format check. The format and the
     * conditional requirement are both applied below, in one place.
     */
    email: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform((value) => (value ? value : null)),
    postcode: postcodeSchema,
    contactWindow: z.string().trim().max(120).nullish(),
    marketingConsent: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.email === null) {
      if (data.preferredContactMethod === "email") {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Enter an email address, or choose another way to reach you",
        });
      }
      return;
    }
    if (!z.email().safeParse(data.email).success) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter an email address",
      });
    }
  });

export type StartLeadData = z.infer<typeof startLeadSchema>;
export type CarData = z.infer<typeof carSchema>;
export type SaleData = z.infer<typeof saleSchema>;
export type ContactData = z.infer<typeof contactSchema>;
