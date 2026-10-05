import { db, isDatabaseConfigured } from "@/lib/db";
import type { StepOneData, StepTwoData } from "@/lib/validation";

/**
 * The submissions store. Postgres via Supabase from Phase B; the Airtable
 * implementation it replaced is kept unused in lib/adapters/airtable.ts.
 *
 * The interface is unchanged from Phase A so the existing form paths keep
 * working while the form itself is restructured in a later session.
 *
 * Without Supabase credentials this falls back to a logging store: the
 * seller still gets a success, but NOTHING IS PERSISTED. The logs are
 * deliberately loud and /valuation shows a dev banner while keys are
 * missing.
 */

export function isStoreConfigured(): boolean {
  return isDatabaseConfigured();
}

/**
 * The form and the database disagree about how to spell these, and the
 * mismatch is silent if unmapped — Postgres would simply reject the
 * insert at runtime. Exported so it can be tested directly.
 */
const TIMELINE_TO_DB = {
  asap: "asap",
  "this-month": "this_month",
  "next-few-months": "few_months",
  "just-researching": "researching",
} as const;

export function timelineToDb(
  timeline: StepTwoData["sellTimeline"],
): (typeof TIMELINE_TO_DB)[keyof typeof TIMELINE_TO_DB] {
  return TIMELINE_TO_DB[timeline];
}

function logUnpersisted(action: string, payload: unknown) {
  console.error(
    [
      "",
      "==============================================================",
      "  SUBMISSION NOT PERSISTED — SUPABASE NOT CONFIGURED",
      `  ${action} was accepted from a seller and stored NOWHERE.`,
      "  Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. See PENDING-INFO.md.",
      "==============================================================",
      JSON.stringify(payload, null, 2),
      "==============================================================",
      "",
    ].join("\n"),
  );
}

export async function createSubmission(
  data: StepOneData,
  vehicleId?: string | null,
): Promise<{ id: string }> {
  if (!isStoreConfigured()) {
    const id = `unpersisted-${crypto.randomUUID()}`;
    logUnpersisted("Step 1", { id, vehicleId, ...data });
    return { id };
  }

  const { data: row, error } = await db()
    .from("leads")
    .insert({
      reg: data.reg,
      vehicle_id: vehicleId ?? null,
      mileage_reported: data.mileage,
      postcode: data.postcode,
      name: data.name,
      phone: data.phone,
      email: data.email,
      marketing_consent: data.marketingConsent,
      consent_at: data.marketingConsent ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`createSubmission failed: ${error.message}`);
  return { id: row.id as string };
}

export async function updateSubmission(
  id: string,
  data: StepTwoData,
): Promise<void> {
  if (!isStoreConfigured() || id.startsWith("unpersisted-")) {
    logUnpersisted("Step 2", { id, ...data });
    return;
  }

  const { error } = await db()
    .from("leads")
    .update({
      finance_outstanding: data.financeOutstanding,
      service_history: data.serviceHistory,
      keepers: data.keepers,
      // The current step 2 asks a single free-text question about damage
      // and warning lights. The schema splits that across condition,
      // warning_lights and known_faults; it lands here until the form is
      // restructured into four steps.
      known_faults: data.conditionNotes,
      timeline: timelineToDb(data.sellTimeline),
    })
    .eq("id", id);

  if (error) throw new Error(`updateSubmission failed: ${error.message}`);
}
