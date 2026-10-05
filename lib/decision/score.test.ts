import { describe, expect, it } from "vitest";
import { score, type ScoreInput } from "./score";
import type { Settings } from "./settings";

const NOW = new Date("2026-10-05T12:00:00Z");

/** Everything configured, so margin logic is reachable. */
const FULL_SETTINGS: Settings = {
  margin_floor_export: 3500,
  margin_floor_domestic: 500,
  shipping_gbp: 900,
  marine_insurance_gbp: 150,
  cyprus_clearance_gbp: 400,
  cyprus_registration_gbp: 300,
  cyprus_vat_rate: 0.19,
  recon_default_gbp: 600,
  cra_contingency_pct: 0.05,
  target_models: ["Range Rover", "Defender", "Discovery Sport", "Lexus"],
  days_to_sell_table: { default: 18 },
  export_slot_open: true,
  sla_hours: 2,
};

/** What is actually seeded today: the two floors and nothing else. */
const SEEDED_ONLY: Settings = {
  margin_floor_export: 3500,
  margin_floor_domestic: 500,
};

function input(over: Partial<ScoreInput> = {}): ScoreInput {
  return {
    lead: {
      timeline: "asap",
      mileageReported: 40000,
      serviceHistory: "full",
      condition: { bodywork: { grade: "good" } },
      financeOutstanding: "no",
      photoCount: 4,
    },
    vehicle: {
      make: "LAND ROVER",
      model: "DISCOVERY SPORT",
      firstRegistered: "2023-06-01",
      yearOfManufacture: 2023,
    },
    mot: [{ testDate: "2026-06-01", odometer: 38000 }],
    settings: FULL_SETTINGS,
    now: NOW,
    ...over,
  };
}

describe("export eligibility", () => {
  it("accepts a young target model with everything configured", () => {
    const result = score(input());
    expect(result.targetModelMatch).toBe(true);
    expect(result.ageAtLandingYears).toBeLessThan(5);
    expect(result.exportBlockers).toEqual([]);
    expect(result.exportEligible).toBe(true);
  });

  it("blocks a car too old at landing", () => {
    const result = score(
      input({
        vehicle: {
          make: "LAND ROVER",
          model: "DISCOVERY SPORT",
          firstRegistered: "2019-01-01",
          yearOfManufacture: 2019,
        },
      }),
    );
    expect(result.exportEligible).toBe(false);
    expect(result.exportBlockers.some((b) => b.includes("over five years"))).toBe(true);
  });

  it("uses landing date, not today, for the five-year line", () => {
    // Registered 2021-10-20: four years and eleven months today, but over
    // five years once five weeks of shipping are added.
    const result = score(
      input({
        vehicle: {
          make: "LAND ROVER",
          model: "DEFENDER",
          firstRegistered: "2021-10-20",
          yearOfManufacture: 2021,
        },
      }),
    );
    expect(result.ageAtLandingYears).toBeGreaterThan(5);
    expect(result.exportBlockers.some((b) => b.includes("over five years"))).toBe(true);
  });

  it("blocks a non-target model", () => {
    const result = score(
      input({
        vehicle: {
          make: "VOLKSWAGEN",
          model: "GOLF",
          firstRegistered: "2023-06-01",
          yearOfManufacture: 2023,
        },
      }),
    );
    expect(result.targetModelMatch).toBe(false);
    expect(result.exportBlockers).toContain("not a target model");
  });

  it("blocks when no export capital slot is free", () => {
    const result = score(
      input({ settings: { ...FULL_SETTINGS, export_slot_open: false } }),
    );
    expect(result.exportBlockers).toContain("no export capital slot free");
  });

  it("treats a missing registration date as unknown, not as young", () => {
    const result = score(
      input({
        vehicle: { make: "LEXUS", model: "RX", firstRegistered: null, yearOfManufacture: null },
      }),
    );
    expect(result.ageAtLandingYears).toBeNull();
    expect(result.exportBlockers).toContain("age unknown");
    expect(result.exportEligible).toBe(false);
  });
});

describe("refusing to score without settings", () => {
  it("names every missing setting individually", () => {
    const result = score(input({ settings: SEEDED_ONLY }));
    const text = result.flags.join(" ");
    for (const label of [
      "shipping cost",
      "marine insurance cost",
      "Cyprus clearance cost",
      "Cyprus registration cost",
      "Cyprus VAT rate",
      "default reconditioning allowance",
      "Consumer Rights Act contingency percentage",
    ]) {
      expect(text, `missing label: ${label}`).toContain(label);
    }
  });

  it("returns no channel and low confidence rather than a guess", () => {
    const result = score(input({ settings: SEEDED_ONLY }));
    expect(result.recommendedChannel).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.projectedMarginExport).toBeNull();
    expect(result.projectedMarginDomestic).toBeNull();
    expect(result.maxBidExport).toBeNull();
    expect(result.maxBidDomestic).toBeNull();
  });

  it("still reports what it does know", () => {
    const result = score(input({ settings: SEEDED_ONLY }));
    expect(result.ageAtLandingYears).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
  });

  it("says the target list is unconfigured rather than silently failing the match", () => {
    const result = score(input({ settings: SEEDED_ONLY }));
    expect(result.flags.join(" ")).toContain("target model list");
    expect(result.exportBlockers).toContain("target model list not configured");
  });
});

describe("triage score", () => {
  it("ranks an urgent target car above a researching non-target one", () => {
    const urgent = score(input());
    const browsing = score(
      input({
        lead: {
          timeline: "researching",
          mileageReported: null,
          serviceHistory: null,
          condition: null,
          financeOutstanding: null,
          photoCount: 0,
        },
        vehicle: {
          make: "VOLKSWAGEN",
          model: "GOLF",
          firstRegistered: "2015-01-01",
          yearOfManufacture: 2015,
        },
      }),
    );
    expect(urgent.score).toBeGreaterThan(browsing.score);
    // "Just researching" is a follow-up date, never a dead lead.
    expect(browsing.score).toBeGreaterThan(0);
  });

  it("never exceeds 100", () => {
    const result = score(
      input({
        lead: {
          timeline: "asap",
          mileageReported: 1000,
          serviceHistory: "full",
          condition: { bodywork: { grade: "good" }, interior: { grade: "good" } },
          financeOutstanding: "no",
          photoCount: 12,
        },
      }),
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("flags a human should see", () => {
  it("raises outstanding finance", () => {
    const result = score(
      input({ lead: { ...input().lead, financeOutstanding: "yes" } }),
    );
    expect(result.flags.join(" ")).toContain("Outstanding finance");
  });

  it("raises reported mileage below the last MOT reading", () => {
    const result = score(
      input({
        lead: { ...input().lead, mileageReported: 20000 },
        mot: [{ testDate: "2026-06-01", odometer: 38000 }],
      }),
    );
    expect(result.flags.join(" ")).toContain("below the last MOT reading");
  });

  it("does not raise mileage when it has sensibly increased", () => {
    const result = score(input({ lead: { ...input().lead, mileageReported: 41000 } }));
    expect(result.flags.join(" ")).not.toContain("below the last MOT reading");
  });
});

describe("reasoning", () => {
  it("is human sentences, never codes", () => {
    for (const line of score(input()).reasoning) {
      expect(line).toMatch(/^[A-Z]/);
      expect(line).toMatch(/\.$/);
      expect(line).not.toMatch(/_[a-z]+_|ERR_|[A-Z]{4,}_/);
    }
  });

  it("is pure — same input, same output", () => {
    expect(score(input())).toEqual(score(input()));
  });
});
