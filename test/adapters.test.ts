import { describe, expect, it } from "vitest";
import { mapDvla } from "../lib/adapters/dvla";
import { mapDvsa } from "../lib/adapters/dvsa";

/**
 * Fixtures follow the published response schemas. Neither mapping has
 * been exercised against the live APIs — no keys have been issued yet —
 * so these lock in the shape we believe is correct and will be the first
 * thing re-checked when a key lands.
 */
describe("DVLA mapping", () => {
  const raw = {
    registrationNumber: "LM70XYZ",
    make: "LAND ROVER",
    colour: "BLACK",
    fuelType: "DIESEL",
    engineCapacity: 2996,
    yearOfManufacture: 2020,
    monthOfFirstRegistration: "2020-09",
    taxStatus: "Taxed",
    taxDueDate: "2026-09-01",
    motStatus: "Valid",
    motExpiryDate: "2026-08-14",
    co2Emissions: 199,
    euroStatus: "EURO 6",
    typeApproval: "M1",
    wheelplan: "2 AXLE RIGID BODY",
  };

  it("maps the documented fields", () => {
    const v = mapDvla(raw, "LM70XYZ");
    expect(v.make).toBe("LAND ROVER");
    expect(v.engineCc).toBe(2996);
    expect(v.yearOfManufacture).toBe(2020);
    expect(v.motExpiry).toBe("2026-08-14");
  });

  it("never produces a model, because VES has no model field", () => {
    expect(mapDvla(raw, "LM70XYZ").model).toBeNull();
  });

  it("widens month-precision first registration to a date", () => {
    expect(mapDvla(raw, "LM70XYZ").firstRegistered).toBe("2020-09-01");
    expect(mapDvla({}, "LM70XYZ").firstRegistered).toBeNull();
  });

  it("returns nulls rather than undefined for an empty response", () => {
    const v = mapDvla({}, "LM70XYZ");
    expect(v.make).toBeNull();
    expect(v.colour).toBeNull();
    expect(v.engineCc).toBeNull();
  });
});

describe("DVSA mapping", () => {
  it("supplies the model DVLA cannot", () => {
    const mapped = mapDvsa({ make: "LAND ROVER", model: "DISCOVERY SPORT" });
    expect(mapped.model).toBe("DISCOVERY SPORT");
  });

  it("orders tests newest first so index 0 is the latest mileage", () => {
    const mapped = mapDvsa({
      motTests: [
        { completedDate: "2023-08-01", odometerValue: "61000" },
        { completedDate: "2025-08-01", odometerValue: "84000" },
        { completedDate: "2024-08-01", odometerValue: "72500" },
      ],
    });
    expect(mapped.tests.map((t) => t.odometer)).toEqual([84000, 72500, 61000]);
  });

  it("coerces the odometer string the API returns into a number", () => {
    const mapped = mapDvsa({ motTests: [{ odometerValue: "84000" }] });
    expect(mapped.tests[0].odometer).toBe(84000);
  });

  it("handles a vehicle with no tests, which is normal under 3 years", () => {
    const mapped = mapDvsa({ make: "LAND ROVER", model: "DEFENDER" });
    expect(mapped.tests).toEqual([]);
  });

  it("falls back to advisory for an unrecognised defect type", () => {
    const mapped = mapDvsa({
      motTests: [
        {
          completedDate: "2025-08-01",
          defects: [
            { type: "ADVISORY", text: "Tyre worn" },
            { type: "something-new", text: "Unknown" },
          ],
        },
      ],
    });
    expect(mapped.tests[0].defects.map((d) => d.type)).toEqual([
      "advisory",
      "advisory",
    ]);
  });
});
