"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";

/**
 * Setting or clearing a follow-up date, and logging that a call happened.
 *
 * Nothing here contacts the seller. CLAUDE.md section 10 and the Phase E
 * note are explicit that reminders go to the operator and never become
 * automated messages to a seller, so this writes a date and a note and
 * stops.
 */

const dateSchema = z.object({
  leadId: z.string().uuid(),
  // Empty string clears the date. A follow-up that is no longer owed
  // should be removable without inventing a far-future placeholder.
  nextContactDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal("")),
});

export async function setFollowUpDate(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) throw new Error("not signed in");

  const parsed = dateSchema.safeParse({
    leadId: formData.get("leadId"),
    nextContactDate: formData.get("nextContactDate") ?? "",
  });
  if (!parsed.success) return;

  const { leadId, nextContactDate } = parsed.data;
  const value = nextContactDate === "" ? null : nextContactDate;

  const { data: before } = await db()
    .from("leads")
    .select("next_contact_date")
    .eq("id", leadId)
    .maybeSingle();

  await db()
    .from("leads")
    .update({ next_contact_date: value, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  await db().from("audit_log").insert({
    actor: admin.email,
    lead_id: leadId,
    action: "followup.date",
    before: before ?? null,
    after: { next_contact_date: value },
  });

  revalidatePath("/admin/follow-ups");
  revalidatePath(`/admin/leads/${leadId}`);
}
