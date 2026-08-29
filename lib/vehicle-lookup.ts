/**
 * Vehicle lookup behind a typed interface.
 *
 * Later this wires to the DVLA Vehicle Enquiry Service API (make, model,
 * year, fuel from a registration) and the DVSA MOT History API (mileage
 * history). Both keys are listed in PENDING-INFO.md. Until they exist,
 * the stub returns null and callers proceed without enrichment.
 */

export interface VehicleLookupResult {
  make: string;
  model: string | null;
  year: number | null;
  fuelType: string | null;
  colour: string | null;
  motMileageHistory: Array<{ date: string; mileage: number }>;
}

export async function lookupVehicle(
  reg: string,
): Promise<VehicleLookupResult | null> {
  if (!process.env.DVLA_VES_API_KEY) {
    return null;
  }
  // DVLA/DVSA wiring lands in Milestone 5 once keys exist.
  void reg;
  return null;
}
