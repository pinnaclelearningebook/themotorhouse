"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";

/**
 * Recording an offer a person has decided on.
 *
 * Named "record", not "make", and that is not cosmetic: nothing in this
 * repository calculates an offer. The number arrives as keystrokes from
 * someone who has looked at the car, and this function's only job is to
 * write it down, stamp who wrote it, and leave an audit trail.
 * test/constraints.test.ts fails the build on any function named as
 * though it produced one.
 *
 * The offer does not change once sent. There is deliberately no action
 * here that edits an offer's amount — a wrong figure is superseded by a
 * new row, so the history of what the seller was told stays intact.
 */

async function actor(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("not signed in");
  return admin.email;
}

const offerSchema = z.object({
  leadId: z.string().uuid(),
  amount: z.coerce.number().int().min(1).max(1_000_000),
  validUntil: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal("")),
  channel: z.enum(["export", "domestic"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function recordOffer(formData: FormData) {
  const email = await actor();
  const parsed = offerSchema.safeParse({
    leadId: formData.get("leadId"),
    amount: formData.get("amount"),
    validUntil: formData.get("validUntil") ?? "",
    channel: formData.get("channel"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return;

  const { leadId, amount, validUntil, channel, notes } = parsed.data;

  await db().from("offers").insert({
    lead_id: leadId,
    made_by: email,
    amount,
    valid_until: validUntil || null,
    channel,
    status: "sent",
    notes: notes || null,
  });

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
    actor: email,
    lead_id: leadId,
    action: "offer.recorded",
    after: { amount, channel, valid_until: validUntil || null },
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/pipeline");
}

const statusSchema = z.object({
  leadId: z.string().uuid(),
  offerId: z.string().uuid(),
  status: z.enum(["accepted", "declined", "expired"]),
});

/** The seller's answer. Accepting an offer is what sets the purchase price. */
export async function setOfferOutcome(formData: FormData) {
  const email = await actor();
  const parsed = statusSchema.safeParse({
    leadId: formData.get("leadId"),
    offerId: formData.get("offerId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const { leadId, offerId, status } = parsed.data;

  const { data: before } = await db()
    .from("offers")
    .select("status, amount")
    .eq("id", offerId)
    .maybeSingle();

  await db().from("offers").update({ status }).eq("id", offerId);

  if (status === "accepted") {
    await db()
      .from("leads")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", leadId);
  } else if (status === "declined") {
    await db()
      .from("leads")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", leadId);
  }

  await db().from("audit_log").insert({
    actor: email,
    lead_id: leadId,
    action: "offer.outcome",
    before: before ?? null,
    after: { status },
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/pipeline");
}
