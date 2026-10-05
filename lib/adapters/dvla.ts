import "server-only";
import type { VehicleIdentity } from "@/lib/types";

/**
 * DVLA Vehicle Enquiry Service.
 *
 * Field names below are taken from the published VES v1.2.0 response
 * schema. That schema has 22 fields and NO model field — model is not
 * available from DVLA at any price. See ARCHITECTURE.md section 3.
 */

const DVLA_URL =
  process.env.DVLA_VES_URL ??
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

export function isDvlaConfigured(): boolean {
  return Boolean(process.env.DVLA_VES_API_KEY);
}

/** The subset of the VES response we map. */
interface DvlaResponse {
  registrationNumber?: string;
  make?: string;
  colour?: string;
  fuelType?: string;
  engineCapacity?: number;
  yearOfManufacture?: number;
  monthOfFirstRegistration?: string;
  taxStatus?: string;
  taxDueDate?: string;
  motStatus?: string;
  motExpiryDate?: string;
  co2Emissions?: number;
  euroStatus?: string;
  typeApproval?: string;
  wheelplan?: string;
}

/** "2019-03" → "2019-03-01". DVLA gives month precision, not a day. */
function monthToDate(month: string | undefined): string | null {
  return month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : null;
}

export function mapDvla(raw: DvlaResponse, reg: string): VehicleIdentity {
  return {
    reg,
    make: raw.make ?? null,
    // Never populated from DVLA. Filled from MOT history when one exists.
    model: null,
    derivative: null,
    colour: raw.colour ?? null,
    fuel: raw.fuelType ?? null,
    engineCc: raw.engineCapacity ?? null,
    yearOfManufacture: raw.yearOfManufacture ?? null,
    firstRegistered: monthToDate(raw.monthOfFirstRegistration),
    taxStatus: raw.taxStatus ?? null,
    taxDue: raw.taxDueDate ?? null,
    motStatus: raw.motStatus ?? null,
    motExpiry: raw.motExpiryDate ?? null,
    co2: raw.co2Emissions ?? null,
    euroStatus: raw.euroStatus ?? null,
    typeApproval: raw.typeApproval ?? null,
    wheelplan: raw.wheelplan ?? null,
  };
}

export async function fetchDvla(
  reg: string,
): Promise<{ vehicle: VehicleIdentity; raw: unknown } | null> {
  if (!isDvlaConfigured()) return null;

  const response = await fetch(DVLA_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.DVLA_VES_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ registrationNumber: reg }),
    cache: "no-store",
  });

  // 404 is a legitimate answer: no such vehicle. Anything else is a fault.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`DVLA lookup failed: ${response.status}`);
  }

  const raw = (await response.json()) as DvlaResponse;
  return { vehicle: mapDvla(raw, reg), raw };
}
