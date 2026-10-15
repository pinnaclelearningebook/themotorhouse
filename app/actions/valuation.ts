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
  markStep,
  patchLead,
  salePatch,
  startLead,
} from "@/lib/submissions";
import { sendOperatorAlert, sendSellerConfirmation } from "@/lib/email";
import { recordThankYouState } from "@/lib/thank-you-state";
import { rememberOwnedLead } from "@/lib/agent/session";
import { runEnrichment } from "@/lib/decision/enrich";

/**
 * The four-step form persists incrementally.
 *
 * A lead exists from the moment the car is confirmed (CLAUDE.md §9), so
 * step 1 creates the row and steps 2, 3 and 4 patch it. Every contact
 * detail arrives at step 4, so a row is only something someone can act
 * on once that step submits — before then it is drop-off data, and the
 * inbox hides it.
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

/**
 * Step 1 — creates the lead. No alert.
 *
 * There used to be a "lead started" alert here, when the row carried a
 * phone number and was therefore worth ringing. It is not any more:
 * an alert naming a registration nobody can be contacted about is an
 * interruption with no action attached to it, and three of those a day
 * is how an operator learns to ignore the alerts that matter. The row
 * is still written, and /admin still counts it.
 */
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

  // Bind the lead to this browser. The agent endpoint will only accept a
  // lead id this cookie vouches for, because a registration is visible on
  // any parked car and would otherwise be enough to claim someone's
  // record. See lib/agent/session.ts.
  try {
    await rememberOwnedLead(id);
  } catch (error) {
    console.error("could not record lead ownership", error);
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
    await markStep(id, 3);
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
    await markStep(id, 4);
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
  summary: { reg: string; mileage?: number | null },
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
    phone: parsed.data.phone,
    preferredContactMethod: parsed.data.preferredContactMethod,
    mileage: summary.mileage ?? null,
    postcode: parsed.data.postcode,
    name: parsed.data.name,
    email: parsed.data.email,
    marketingConsent: parsed.data.marketingConsent,
  };

  /*
   * Both emails are allowed to fail, and neither may cost the lead —
   * the row is already written above. But "valuation email failed"
   * for both was not enough to read: the two failures mean entirely
   * different things. An operator alert that does not arrive means
   * nobody knows the lead exists. A seller confirmation that does not
   * arrive means the seller is waiting on a promise the site made on
   * screen and did not keep. The log now names which, and says what
   * the consequence is, because that line is the only place either
   * failure surfaces.
   */
  const [operator, seller] = await Promise.allSettled([
    sendOperatorAlert(alert),
    sendSellerConfirmation(alert),
  ]);
  if (operator.status === "rejected") {
    console.error(
      `OPERATOR ALERT NOT SENT for lead ${id} (${summary.reg}). ` +
        "Nobody has been told this lead exists; it is in /admin only. " +
        `Cause: ${operator.reason}`,
    );
  }
  if (seller.status === "rejected") {
    console.error(
      `SELLER CONFIRMATION NOT SENT to ${parsed.data.email} for lead ${id}. ` +
        "The thank-you page will not claim we emailed them. " +
        `Cause: ${seller.reason}`,
    );
  }
  // What the thank-you page is allowed to say next: which channel the
  // seller chose, and whether an email actually went. `fulfilled` is
  // not enough on its own for the second — sendSellerConfirmation
  // resolves without sending when there is no address and when Resend
  // is unconfigured, so only its `true` means an email exists for the
  // seller to look for.
  await recordThankYouState({
    method: parsed.data.preferredContactMethod,
    confirmation:
      seller.status === "fulfilled" && seller.value === true
        ? "sent"
        : "failed",
  });

  // Enrich inline so the scored alert arrives with the submission rather
  // than on the next cron tick. Cron is the catch-up, not the mechanism
  // (ARCHITECTURE.md section 9). A failure here leaves pending_enrichment
  // true, so the sweep picks it up — the seller is unaffected either way.
  try {
    await runEnrichment(id);
  } catch (error) {
    console.error("inline enrichment failed; cron will retry", error);
  }

  return { status: "ok" };
}
