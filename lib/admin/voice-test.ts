import "server-only";
import { db } from "@/lib/db";

/**
 * A realistic car to test voice against.
 *
 * Maya refuses to state facts the lookup has not given her, so testing
 * against an empty vehicle context only ever exercises her saying she
 * does not know. This seeds a vehicle and MOT history shaped like the
 * DVSA's — three tests, rising mileage, an advisory — so a test call
 * exercises the behaviour that matters: recognising the car, using its
 * mileage, and still refusing to price it.
 *
 * Everything it creates is marked. The lead carries a source of
 * "admin-test" and the conversation carries admin_test, so nothing here
 * is counted as a seller.
 */

export const TEST_REG = "TE57VOX";
export const TEST_SOURCE = "admin-test";

export interface SeededTestLead {
  leadId: string;
  vehicleId: string;
  reg: string;
}

export async function seedVoiceTestLead(by: string): Promise<SeededTestLead | null> {
  const client = db();

  const { data: vehicle, error: vehicleError } = await client
    .from("vehicles")
    .upsert(
      {
        reg: TEST_REG,
        make: "LAND ROVER",
        model: "DEFENDER 110",
        derivative: "D300 X-Dynamic HSE",
        colour: "Santorini Black",
        fuel: "DIESEL",
        engine_cc: 2996,
        year_of_manufacture: 2021,
        first_registered: "2021-06-18",
        tax_status: "Taxed",
        mot_status: "Valid",
        mot_expiry: "2027-06-02",
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "reg" },
    )
    .select("id")
    .maybeSingle();

  if (vehicleError || !vehicle) {
    console.error("[admin] could not seed the test vehicle:", vehicleError?.message);
    return null;
  }

  const vehicleId = vehicle.id as string;

  // DVSA-shaped history: annual tests from the third year, mileage that
  // only ever rises, and one advisory — the shape a real record has.
  await client.from("mot_tests").delete().eq("vehicle_id", vehicleId);
  await client.from("mot_tests").insert([
    {
      vehicle_id: vehicleId,
      test_date: "2024-06-01",
      result: "PASSED",
      expiry_date: "2025-06-01",
      odometer: 21450,
      odometer_unit: "mi",
      defects: [],
    },
    {
      vehicle_id: vehicleId,
      test_date: "2025-05-28",
      result: "PASSED",
      expiry_date: "2026-05-28",
      odometer: 34110,
      odometer_unit: "mi",
      defects: [
        { type: "ADVISORY", text: "Nearside front tyre worn close to the legal limit" },
      ],
    },
    {
      vehicle_id: vehicleId,
      test_date: "2026-06-02",
      result: "PASSED",
      expiry_date: "2027-06-02",
      odometer: 46980,
      odometer_unit: "mi",
      defects: [],
    },
  ]);

  const { data: lead, error: leadError } = await client
    .from("leads")
    .insert({
      reg: TEST_REG,
      vehicle_id: vehicleId,
      phone: "07700 900000",
      name: "Voice test",
      source: TEST_SOURCE,
      notes: `Seeded for a voice test by ${by}. Not a real seller.`,
      mileage_reported: 46980,
    })
    .select("id")
    .maybeSingle();

  if (leadError || !lead) {
    console.error("[admin] could not seed the test lead:", leadError?.message);
    return null;
  }

  return { leadId: lead.id as string, vehicleId, reg: TEST_REG };
}
