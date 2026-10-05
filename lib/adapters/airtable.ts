import Airtable from "airtable";
/**
 * Frozen local copies of the shapes this adapter was written against.
 * It deliberately does not import the live validation types: this file
 * is a record of the Phase A store, and it should not break or silently
 * change meaning every time the form evolves.
 */
interface StepOneData {
  reg: string;
  mileage: number;
  postcode: string;
  name: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
}

interface StepTwoData {
  financeOutstanding: "yes" | "no" | "unsure";
  serviceHistory: "full" | "partial" | "none";
  keepers: number | null;
  conditionNotes: string | null;
  sellTimeline: "asap" | "this-month" | "next-few-months" | "just-researching";
}

/**
 * UNUSED — superseded by Postgres in lib/submissions.ts (Phase B).
 *
 * Kept per CLAUDE.md section 2 ("the Airtable adapter stays in
 * lib/adapters/ unused") so the Phase A store remains recoverable if the
 * Postgres migration has to be rolled back. Nothing imports this.
 *
 * The original note follows.
 *
 * The submissions store. Airtable to start, behind this interface so it
 * can be swapped for Postgres later without touching the form.
 *
 * Without AIRTABLE_API_KEY and AIRTABLE_BASE_ID, falls back to a logging
 * store: the seller still gets a success, but NOTHING IS PERSISTED.
 * The fallback logs are deliberately loud and /valuation shows a dev
 * banner while the keys are missing.
 */

const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? "Submissions";

export function isStoreConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

function airtableBase() {
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID as string,
  );
}

function logUnpersisted(action: string, payload: unknown) {
  console.error(
    [
      "",
      "==============================================================",
      "  SUBMISSION NOT PERSISTED — AIRTABLE KEYS MISSING",
      `  ${action} was accepted from a seller and stored NOWHERE.`,
      "  Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID. See PENDING-INFO.md.",
      "==============================================================",
      JSON.stringify(payload, null, 2),
      "==============================================================",
      "",
    ].join("\n"),
  );
}

export async function createSubmission(
  data: StepOneData,
): Promise<{ id: string }> {
  const createdAt = new Date().toISOString();

  if (!isStoreConfigured()) {
    const id = `unpersisted-${crypto.randomUUID()}`;
    logUnpersisted("Step 1", { id, createdAt, ...data });
    return { id };
  }

  const record = await airtableBase()(TABLE_NAME).create({
    createdAt,
    reg: data.reg,
    mileage: data.mileage,
    postcode: data.postcode,
    name: data.name,
    phone: data.phone,
    email: data.email,
    marketingConsent: data.marketingConsent,
  });
  return { id: record.getId() };
}

export async function updateSubmission(
  id: string,
  data: StepTwoData,
): Promise<void> {
  if (!isStoreConfigured() || id.startsWith("unpersisted-")) {
    logUnpersisted("Step 2", { id, ...data });
    return;
  }

  await airtableBase()(TABLE_NAME).update(id, {
    financeOutstanding: data.financeOutstanding,
    serviceHistory: data.serviceHistory,
    keepers: data.keepers ?? undefined,
    conditionNotes: data.conditionNotes ?? undefined,
    sellTimeline: data.sellTimeline,
  });
}
