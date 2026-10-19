import "server-only";
import { db } from "@/lib/db";
import { canMove, refusalFor } from "@/lib/admin/transitions";

/**
 * Writing down an offer a person has decided on.
 *
 * Shared by the lead page's form and the board's drop-into-Offered,
 * because they are the same event and two copies of this would be two
 * copies that disagree about whether the transition was legal.
 *
 * Named "record", not "make". Nothing in this repository calculates
 * an offer: the number arrives as keystrokes from someone who has
 * looked at the car, and this writes it down, stamps who wrote it and
 * leaves a trail. test/constraints.test.ts fails the build on a
 * function named as though it produced one.
 *
 * The transition is checked here as well as in the board, for the
 * same reason `moveLead` checks it: a dialog is a prompt, not a
 * guarantee. A car that has not been contacted cannot be offered on.
 */
export interface OfferWrite {
  leadId: string;
  amount: number;
  channel: "export" | "domestic";
  validUntil?: string | null;
  notes?: string | null;
  actor: string;
}

export interface OfferResult {
  ok: boolean;
  message: string;
}

export async function writeOffer(input: OfferWrite): Promise<OfferResult> {
  const { leadId, amount, channel, validUntil, notes, actor } = input;

  const { data: lead } = await db()
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, message: "That lead no longer exists." };

  const from = lead.status as string;
  if (from !== "offered" && !canMove(from, "offered")) {
    return {
      ok: false,
      message:
        refusalFor(from, "offered") ??
        `A car cannot be offered on from ${from}.`,
    };
  }

  const { error } = await db().from("offers").insert({
    lead_id: leadId,
    made_by: actor,
    amount,
    valid_until: validUntil || null,
    channel,
    status: "sent",
    notes: notes || null,
  });
  if (error) {
    console.error("writeOffer insert failed", error);
    return { ok: false, message: "Could not save the offer. Nothing changed." };
  }

  // The channel actually chosen, as distinct from the one recommended.
  await db()
    .from("leads")
    .update({
      status: "offered",
      channel_decided: channel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await db().from("audit_log").insert({
    actor,
    lead_id: leadId,
    action: "offer.recorded",
    before: { status: from },
    after: { amount, channel, valid_until: validUntil || null },
  });

  return { ok: true, message: "Offer recorded" };
}
