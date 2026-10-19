"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";
import { MOVABLE_STATUSES } from "@/lib/admin/pipeline";
import {
  canMove,
  demandFor,
  isLossReason,
  refusalFor,
} from "@/lib/admin/transitions";
import { writeOffer, type OfferResult } from "@/lib/admin/offers";

/**
 * Moving a card, logging a cost, recording a sale.
 *
 * Every write is audited with the actor and the before state, because
 * these are the rows that decide what a car is thought to have earned.
 *
 * None of these actions makes or changes an offer. The offer amount is
 * entered on the lead detail page by a person and is read here only as
 * the purchase price.
 */

async function actor(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("not signed in");
  return admin.email;
}

const moveSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(MOVABLE_STATUSES),
  reason: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export interface MoveResult {
  ok: boolean;
  /** The status the card should show. On a refusal, the one it had. */
  status: string | null;
  message: string;
}

/**
 * Moving a card between stages.
 *
 * **The transition map is checked here, not in the board.** A drag is
 * one gesture with no confirmation step, so the board does refuse an
 * illegal drop before it animates — but that refusal is a courtesy to
 * the person dragging, and this one is the control. A client that is
 * wrong, old or hostile can post anything.
 *
 * Returns a result rather than throwing, because the caller is an
 * optimistic UI that has already moved the card and needs to put it
 * back with something to say.
 *
 * `lost` and `declined` carry a reason, which goes into the audit row
 * structured rather than buried in a note: "why do we lose cars" is a
 * question somebody will ask of this table, and free text cannot
 * answer it.
 */
export async function moveLead(input: unknown): Promise<MoveResult> {
  let email: string;
  try {
    email = await actor();
  } catch {
    return { ok: false, status: null, message: "You are not signed in." };
  }

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: null, message: "That move is not valid." };
  }
  const { leadId, status, reason, note } = parsed.data;

  const { data: before } = await db()
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();
  if (!before) {
    return { ok: false, status: null, message: "That lead no longer exists." };
  }
  const from = before.status as string;

  if (from === status) {
    return { ok: true, status: from, message: "" };
  }

  const refusal = refusalFor(from, status);
  if (refusal || !canMove(from, status)) {
    return {
      ok: false,
      status: from,
      message: refusal ?? `A car cannot go from ${from} to ${status}.`,
    };
  }

  // The demands the UI collects are re-checked here for the same
  // reason the map is: the dialog is the prompt, not the guarantee.
  if (demandFor(status) === "reason" && !isLossReason(reason)) {
    return {
      ok: false,
      status: from,
      message: "A car leaving the pipeline needs a reason.",
    };
  }

  const { error } = await db()
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) {
    console.error("moveLead update failed", error);
    return { ok: false, status: from, message: "Could not save. Nothing changed." };
  }

  await db().from("audit_log").insert({
    actor: email,
    lead_id: leadId,
    action: "lead.status",
    before: { status: from },
    after: {
      status,
      ...(reason ? { reason } : {}),
      ...(note ? { note } : {}),
    },
  });

  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, status, message: `Moved to ${status}` };
}

const costSchema = z.object({
  leadId: z.string().uuid(),
  kind: z.string().trim().min(1).max(60),
  // Whole pounds. Negative is allowed: a refunded deposit or a credit
  // from a supplier is a real cost line and forcing it positive would
  // overstate what the car cost.
  amount: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function logCost(formData: FormData) {
  const email = await actor();
  const parsed = costSchema.safeParse({
    leadId: formData.get("leadId"),
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return;

  const { leadId, kind, amount, note } = parsed.data;

  await db().from("car_costs").insert({
    lead_id: leadId,
    kind,
    amount,
    note: note || null,
    logged_by: email,
  });

  await db().from("audit_log").insert({
    actor: email,
    lead_id: leadId,
    action: "cost.logged",
    after: { kind, amount },
  });

  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/leads/${leadId}`);
}

const saleSchema = z.object({
  leadId: z.string().uuid(),
  soldPrice: z.coerce.number().int().min(0).max(1_000_000),
  soldOn: z.string().trim().min(1),
});

export async function recordSale(formData: FormData) {
  const email = await actor();
  const parsed = saleSchema.safeParse({
    leadId: formData.get("leadId"),
    soldPrice: formData.get("soldPrice"),
    soldOn: formData.get("soldOn"),
  });
  if (!parsed.success) return;

  const { leadId, soldPrice, soldOn } = parsed.data;

  const { data: before } = await db()
    .from("leads")
    .select("sold_price, sold_on, status")
    .eq("id", leadId)
    .maybeSingle();

  await db()
    .from("leads")
    .update({
      sold_price: soldPrice,
      sold_on: soldOn,
      status: "sold",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await db().from("audit_log").insert({
    actor: email,
    lead_id: leadId,
    action: "sale.recorded",
    before: before ?? null,
    after: { sold_price: soldPrice, sold_on: soldOn, status: "sold" },
  });

  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/leads/${leadId}`);
}

const boardOfferSchema = z.object({
  leadId: z.string().uuid(),
  amount: z.coerce.number().int().min(1).max(1_000_000),
  note: z.string().trim().max(500).optional(),
});

/**
 * Dropping a card into Offered.
 *
 * The same write as the lead page's form, through the same shared
 * function, so the transition check and the audit row cannot drift
 * between the two places an offer can be entered.
 *
 * The channel defaults to domestic because that is what most cars
 * are, and because the board has no room to ask. A person changing
 * it does so on the lead page, with the decision panel in front of
 * them — which is where that choice belongs anyway.
 */
export async function recordOfferOnBoard(input: unknown): Promise<OfferResult> {
  let email: string;
  try {
    email = await actor();
  } catch {
    return { ok: false, message: "You are not signed in." };
  }

  const parsed = boardOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That offer is not valid." };
  }
  const { leadId, amount, note } = parsed.data;

  const result = await writeOffer({
    leadId,
    amount,
    channel: "domestic",
    notes: note ?? null,
    actor: email,
  });

  if (result.ok) {
    revalidatePath("/admin/pipeline");
    revalidatePath("/admin/inbox");
    revalidatePath(`/admin/leads/${leadId}`);
  }
  return result;
}
