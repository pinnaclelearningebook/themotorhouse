"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin/auth";

/**
 * Bulk changes from the inbox.
 *
 * Two of them, both chosen because they are reversible: a status and
 * a follow-up date. There is deliberately no bulk delete and no bulk
 * offer — an offer is a number a person types after looking at one
 * car, and nothing in this repository produces one
 * (test/constraints.test.ts fails the build on a function named as
 * though it did).
 *
 * **One audit row per lead, never one per batch.** A single row
 * saying "12 leads moved to contacted" cannot answer the only
 * question anyone ever asks of an audit log, which is what happened
 * to *this* lead. The `before` value is read first for the same
 * reason: a log that records the new value and not the old one tells
 * you where something ended up and not what it was.
 */

const LEAD_STATUS = [
  "new",
  "contacted",
  "offered",
  "accepted",
  "collected",
  "listed",
  "shipped",
  "sold",
  "declined",
  "lost",
] as const;

const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(LEAD_STATUS),
});

const bulkFollowUpSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  /** Empty clears the date, which is how a lead leaves the list. */
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal("")),
});

export interface BulkResult {
  ok: boolean;
  changed: number;
  message: string;
}

async function actor(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("not signed in");
  return admin.email;
}

/**
 * Reads the current values, writes the new one, then writes one audit
 * row per lead with both. Leads whose value is already the target are
 * skipped rather than logged as changes that did not happen.
 */
async function applyBulk(
  ids: string[],
  column: "status" | "next_contact_date",
  value: string | null,
  action: string,
): Promise<BulkResult> {
  const by = await actor();

  /*
   * Both columns named explicitly rather than interpolating the one
   * in play. test/query-audit.test.ts reads every query's column list
   * out of the source to check it against the migrations, and a
   * template literal is a column name it cannot resolve — so a
   * dynamic select buys nothing and costs the only check that catches
   * a query naming a column that does not exist.
   */
  const { data: before, error: readError } = await db()
    .from("leads")
    .select("id, status, next_contact_date")
    .in("id", ids);
  if (readError) throw new Error(readError.message);

  const changing = (before ?? []).filter(
    (row) => (row as Record<string, unknown>)[column] !== value,
  );
  if (changing.length === 0) {
    return { ok: true, changed: 0, message: "Nothing to change" };
  }
  const changingIds = changing.map((row) => (row as { id: string }).id);

  const { error } = await db()
    .from("leads")
    .update({ [column]: value, updated_at: new Date().toISOString() })
    .in("id", changingIds);
  if (error) throw new Error(error.message);

  await db()
    .from("audit_log")
    .insert(
      changing.map((row) => ({
        actor: by,
        lead_id: (row as { id: string }).id,
        action,
        before: { [column]: (row as Record<string, unknown>)[column] },
        after: { [column]: value },
      })),
    );

  return {
    ok: true,
    changed: changingIds.length,
    message: `${changingIds.length} lead${changingIds.length === 1 ? "" : "s"} updated`,
  };
}

export async function bulkSetStatus(input: unknown): Promise<BulkResult> {
  const parsed = bulkStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, changed: 0, message: "That selection is not valid" };
  }
  try {
    const result = await applyBulk(
      parsed.data.ids,
      "status",
      parsed.data.status,
      "lead.status.bulk",
    );
    revalidatePath("/admin/inbox");
    revalidatePath("/admin");
    revalidatePath("/admin/pipeline");
    return result;
  } catch (error) {
    console.error("bulkSetStatus failed", error);
    return { ok: false, changed: 0, message: "Could not save. Nothing changed." };
  }
}

export async function bulkSetFollowUp(input: unknown): Promise<BulkResult> {
  const parsed = bulkFollowUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, changed: 0, message: "That date is not valid" };
  }
  try {
    const result = await applyBulk(
      parsed.data.ids,
      "next_contact_date",
      parsed.data.date === "" ? null : parsed.data.date,
      "lead.follow_up.bulk",
    );
    revalidatePath("/admin/inbox");
    revalidatePath("/admin/follow-ups");
    revalidatePath("/admin");
    return result;
  } catch (error) {
    console.error("bulkSetFollowUp failed", error);
    return { ok: false, changed: 0, message: "Could not save. Nothing changed." };
  }
}
