"use server";

import { z } from "zod";
import { leadSchema } from "@/lib/validation";
import { createLead } from "@/lib/submissions";
import { sendOperatorAlert, sendSellerConfirmation } from "@/lib/email";

const TRY_AGAIN =
  "Something went wrong at our end. Please try again, or call us instead.";

export type LeadState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: Record<string, string[] | undefined>;
      formError?: string;
    }
  | { status: "success"; id: string };

/**
 * The four-step form's single write. Steps 2 and 3 were held
 * client-side, so this is the first and only persistence point — see
 * CLAUDE.md section 9 and the decision recorded in PENDING-INFO.md.
 */
export async function submitLead(payload: unknown): Promise<LeadState> {
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  let id: string;
  try {
    ({ id } = await createLead(parsed.data));
  } catch (error) {
    console.error("createLead failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }

  // The lead is stored. Email failures must not fail the submission.
  const alert = {
    id,
    reg: parsed.data.reg,
    mileage: parsed.data.mileage,
    postcode: parsed.data.postcode,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    marketingConsent: parsed.data.marketingConsent,
  };
  const results = await Promise.allSettled([
    sendOperatorAlert(alert),
    sendSellerConfirmation(alert),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("valuation email failed", result.reason);
    }
  }

  return { status: "success", id };
}
