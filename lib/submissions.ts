import { db, isDatabaseConfigured } from "@/lib/db";
import type { LeadData } from "@/lib/validation";

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

/**
 * Resolve the vehicle row written by /api/vehicle/lookup. Done here from
 * the registration rather than taking an id from the client, so a
 * submitted form cannot point a lead at an arbitrary vehicle row.
 */
async function findVehicleId(reg: string): Promise<string | null> {
  const { data } = await db()
    .from("vehicles")
    .select("id")
    .eq("reg", reg.replace(/\s+/g, "").toUpperCase())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Creates a lead from the four-step form in a single write. Steps 2 and
 * 3 were held client-side until contact details landed, so everything
 * arrives at once rather than as a series of patches.
 */
export async function createLead(data: LeadData): Promise<{ id: string }> {
  if (!isStoreConfigured()) {
    const id = `unpersisted-${crypto.randomUUID()}`;
    logUnpersisted("Four-step form", { id, ...data });
    return { id };
  }

  const vehicleId = await findVehicleId(data.reg);

  if (vehicleId && data.model) {
    await db()
      .from("vehicles")
      .update({ model: data.model })
      .eq("id", vehicleId)
      .is("model", null);
  }

  const { data: row, error } = await db()
    .from("leads")
    .insert({
      reg: data.reg,
      vehicle_id: vehicleId ?? null,
      name: data.name,
      phone: data.phone,
      email: data.email,
      postcode: data.postcode,
      contact_window: data.contactWindow ?? null,
      marketing_consent: data.marketingConsent,
      consent_at: data.marketingConsent ? new Date().toISOString() : null,
      reason_for_sale: data.reasonForSale ?? null,
      timeline: data.timeline,
      finance_outstanding: data.financeOutstanding ?? null,
      settlement_known: data.settlementKnown ?? null,
      part_exchange_interest: data.partExchangeInterest ?? null,
      fair_price_in_mind: data.fairPrice ?? null,
      others_approached: data.othersApproached ?? null,
      mileage_reported: data.mileage,
      service_history: data.serviceHistory ?? null,
      keepers: data.keepers ?? null,
      condition: data.condition ?? null,
      warning_lights: data.warningLights ?? null,
      known_faults: data.knownFaults ?? null,
      modifications: data.modifications ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`createLead failed: ${error.message}`);
  return { id: row.id as string };
}
