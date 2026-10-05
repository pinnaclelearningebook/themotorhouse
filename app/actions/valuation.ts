"use server";

import { z } from "zod";
import {
  carSchema,
  contactSchema,
  saleSchema,
  startLeadSchema,
} from "@/lib/validation";
import {
  carPatch,
  contactPatch,
  patchLead,
  salePatch,
  startLead,
} from "@/lib/submissions";
import { sendOperatorAlert, sendSellerConfirmation } from "@/lib/email";

/**
 * The four-step form persists incrementally.
 *
 * A lead exists from the moment the car is confirmed and a phone number
 * lands (CLAUDE.md section 9), so step 1 creates the row and steps 2, 3
 * and 4 patch it. Abandoning at any point from step 1 onward leaves a
 * lead someone can ring.
 */

const TRY_AGAIN =
  "Something went wrong at our end. Please try again, or call us instead.";

export type ActionState =
  | { status: "ok" }
  | { status: "created"; id: string }
  | {
      status: "error";
      fieldErrors: Record<string, string[] | undefined>;
      formError?: string;
    };

function invalid(error: z.ZodError): ActionState {
  return { status: "error", fieldErrors: z.flattenError(error).fieldErrors };
}

/** Step 1 — creates the lead and alerts the operator that one started. */
export async function startLeadAction(payload: unknown): Promise<ActionState> {
  const parsed = startLeadSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);

  let id: string;
  try {
    ({ id } = await startLead(parsed.data));
  } catch (error) {
    console.error("startLead failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }

  // Fires on first persistence per CLAUDE.md section 9. Thin by design:
  // a registration and a number is already enough to ring someone, and
  // this is the alert that catches a seller who never finishes.
  try {
    await sendOperatorAlert({
      id,
      reg: parsed.data.reg,
      phone: parsed.data.phone,
      stage: "started",
    });
  } catch (error) {
    console.error("operator alert failed", error);
  }

  return { status: "created", id };
}

/** Step 2 — the car. */
export async function patchCarAction(
  id: string,
  payload: unknown,
): Promise<ActionState> {
  const parsed = carSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await patchLead(id, carPatch(parsed.data));
  } catch (error) {
    console.error("patchCar failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }
  return { status: "ok" };
}

/** Step 3 — the sale. */
export async function patchSaleAction(
  id: string,
  payload: unknown,
): Promise<ActionState> {
  const parsed = saleSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await patchLead(id, salePatch(parsed.data));
  } catch (error) {
    console.error("patchSale failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }
  return { status: "ok" };
}

/**
 * Step 4 — you. The seller's auto-reply can only go now, because this is
 * where the email address lands.
 */
export async function completeLeadAction(
  id: string,
  payload: unknown,
  summary: { reg: string; phone: string; mileage?: number | null },
): Promise<ActionState> {
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await patchLead(id, contactPatch(parsed.data));
  } catch (error) {
    console.error("completeLead failed", error);
    return { status: "error", fieldErrors: {}, formError: TRY_AGAIN };
  }

  const alert = {
    id,
    reg: summary.reg,
    phone: summary.phone,
    mileage: summary.mileage ?? null,
    postcode: parsed.data.postcode,
    name: parsed.data.name,
    email: parsed.data.email,
    marketingConsent: parsed.data.marketingConsent,
    stage: "completed" as const,
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

  return { status: "ok" };
}
