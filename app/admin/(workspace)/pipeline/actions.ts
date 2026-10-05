"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";
import { MOVABLE_STATUSES } from "@/lib/admin/pipeline";

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
});

export async function moveLead(formData: FormData) {
  const email = await actor();
  const parsed = moveSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const { leadId, status } = parsed.data;

  const { data: before } = await db()
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();
  if (!before || before.status === status) return;

  await db()
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  await db().from("audit_log").insert({
    actor: email,
    lead_id: leadId,
    action: "lead.status",
    before: { status: before.status },
    after: { status },
  });

  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/leads/${leadId}`);
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
