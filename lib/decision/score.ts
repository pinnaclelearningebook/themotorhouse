import {
  DOMESTIC_KEYS,
  LANDED_COST_KEYS,
  missingSettings,
  SETTING_LABELS,
  type Settings,
} from "./settings";

/**
 * The decision engine. A pure function: same inputs, same output, no IO.
 *
 * TWO THINGS THIS DELIBERATELY DOES NOT DO.
 *
 * It does not make or suggest an offer. It produces a maximum bid and a
 * recommendation; a person types the number (CLAUDE.md sections 1 and 17).
 *
 * It does not compute a margin from settings that are absent. Shipping,
 * clearance, VAT handling, recon and the contingency are unconfirmed, so
 * any margin derived from them would be fiction wearing the costume of a
 * number. Instead it reports exactly which settings are missing, by name,
 * and returns a low confidence with no channel recommendation.
 *
 * `score` is a TRIAGE PRIORITY, not money and not a valuation. It answers
 * "how much does this lead deserve attention first", from facts we
 * actually have: target model, age, how soon they want to sell, and how
 * completely they filled the form. It is safe to sort an inbox by and
 * unsafe to read as anything financial.
 */

export type Channel = "export" | "domestic" | "pass";
export type Confidence = "low" | "medium" | "high";

export interface ScoreLead {
  timeline: "asap" | "this_month" | "few_months" | "researching" | null;
  mileageReported: number | null;
  serviceHistory: "full" | "partial" | "none" | null;
  condition: Record<string, { grade: string; note?: string }> | null;
  financeOutstanding: "yes" | "no" | "unsure" | null;
  photoCount: number;
}

export interface ScoreVehicle {
  make: string | null;
  model: string | null;
  firstRegistered: string | null;
  yearOfManufacture: number | null;
}

export interface ScoreMot {
  testDate: string | null;
  odometer: number | null;
}

export interface ScoreInput {
  lead: ScoreLead;
  vehicle: ScoreVehicle | null;
  mot: ScoreMot[];
  settings: Settings;
  /** Injected so the function stays pure and testable. */
  now: Date;
}

export interface Enrichment {
  ageAtLandingYears: number | null;
  targetModelMatch: boolean;
  exportEligible: boolean;
  exportBlockers: string[];
  projectedMarginExport: number | null;
  projectedMarginDomestic: number | null;
  maxBidExport: number | null;
  maxBidDomestic: number | null;
  daysToSellEstimate: number | null;
  score: number;
  confidence: Confidence;
  recommendedChannel: Channel | null;
  reasoning: string[];
  flags: string[];
}

/** A car bought today lands roughly five weeks later (ARCHITECTURE §5). */
const WEEKS_TO_LANDING = 5;
const EXPORT_MAX_AGE_AT_LANDING = 5;

function ageAtLanding(vehicle: ScoreVehicle | null, now: Date): number | null {
  const basis =
    vehicle?.firstRegistered ??
    (vehicle?.yearOfManufacture ? `${vehicle.yearOfManufacture}-01-01` : null);
  if (!basis) return null;
  const registered = new Date(basis);
  if (Number.isNaN(registered.getTime())) return null;
  const landing = new Date(now);
  landing.setDate(landing.getDate() + WEEKS_TO_LANDING * 7);
  const years =
    (landing.getTime() - registered.getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.round(years * 100) / 100;
}

function matchesTargetModel(
  vehicle: ScoreVehicle | null,
  targets: string[] | undefined,
): boolean {
  if (!vehicle || !targets?.length) return false;
  const haystack = `${vehicle.make ?? ""} ${vehicle.model ?? ""}`
    .toLowerCase()
    .trim();
  return targets.some((target) => haystack.includes(target.toLowerCase()));
}

/** Triage priority out of 100. Never money. */
function triageScore(input: ScoreInput, targetMatch: boolean, age: number | null) {
  const parts: Array<{ points: number; why: string }> = [];

  const timelinePoints: Record<string, number> = {
    asap: 35,
    this_month: 28,
    few_months: 15,
    researching: 6,
  };
  if (input.lead.timeline) {
    parts.push({
      points: timelinePoints[input.lead.timeline] ?? 0,
      why: `Seller said ${input.lead.timeline.replace(/_/g, " ")}`,
    });
  }

  if (targetMatch) {
    parts.push({ points: 25, why: "One of the models we actively target" });
  }

  if (age !== null && age <= EXPORT_MAX_AGE_AT_LANDING) {
    parts.push({
      points: 20,
      why: `Would be ${age} years old at landing, inside the five-year line`,
    });
  }

  // Completeness: a well-described car is faster to price and more likely
  // to hold its number.
  let completeness = 0;
  if (input.lead.mileageReported) completeness += 5;
  if (input.lead.serviceHistory) completeness += 4;
  if (input.lead.condition && Object.keys(input.lead.condition).length) {
    completeness += 6;
  }
  if (input.lead.photoCount > 0) {
    completeness += Math.min(5, input.lead.photoCount);
  }
  if (completeness > 0) {
    parts.push({ points: completeness, why: "Form filled in with real detail" });
  }

  const total = parts.reduce((sum, part) => sum + part.points, 0);
  return { total: Math.min(100, total), parts };
}

export function score(input: ScoreInput): Enrichment {
  const reasoning: string[] = [];
  const flags: string[] = [];
  const exportBlockers: string[] = [];

  const age = ageAtLanding(input.vehicle, input.now);
  const targetMatch = matchesTargetModel(
    input.vehicle,
    input.settings.target_models,
  );

  if (age === null) {
    reasoning.push(
      "Age at landing is unknown, because no first-registration date or year came back from the lookup.",
    );
    exportBlockers.push("age unknown");
  } else {
    reasoning.push(
      `The car would be ${age} years old at landing, five weeks after purchase.`,
    );
    if (age > EXPORT_MAX_AGE_AT_LANDING) {
      exportBlockers.push(
        `over five years old at landing (${age})`,
      );
    }
  }

  if (!input.settings.target_models?.length) {
    flags.push(
      `Cannot check the target model list: the ${SETTING_LABELS.target_models} is not set.`,
    );
    exportBlockers.push("target model list not configured");
  } else if (!targetMatch) {
    exportBlockers.push("not a target model");
    reasoning.push(
      `${input.vehicle?.make ?? "The car"} is not on the target model list.`,
    );
  } else {
    reasoning.push("This is one of the models we actively target.");
  }

  if (input.settings.export_slot_open === false) {
    exportBlockers.push("no export capital slot free");
  } else if (input.settings.export_slot_open === undefined) {
    flags.push(
      `Cannot check capital: ${SETTING_LABELS.export_slot_open} is not set.`,
    );
  }

  // Margins. Refused rather than guessed when the inputs are absent.
  const missingLanded = missingSettings(input.settings, [
    ...LANDED_COST_KEYS,
    "margin_floor_export",
  ]);
  const missingDomestic = missingSettings(input.settings, DOMESTIC_KEYS);

  if (missingLanded.length > 0) {
    flags.push(
      `Export margin not calculated. Missing: ${missingLanded
        .map((key) => SETTING_LABELS[key])
        .join(", ")}.`,
    );
  }
  if (missingDomestic.length > 0) {
    flags.push(
      `Domestic margin not calculated. Missing: ${missingDomestic
        .map((key) => SETTING_LABELS[key])
        .join(", ")}.`,
    );
  }

  // A valuation is a paid call a human triggers; without it there is no
  // retail figure to work back from on either channel.
  flags.push(
    "No valuation has been run, so neither margin can be calculated. Run one from this lead if it is worth the cost.",
  );

  const triage = triageScore(input, targetMatch, age);
  for (const part of triage.parts) {
    reasoning.push(`${part.why} (+${part.points}).`);
  }

  const canAssess = missingLanded.length === 0 && missingDomestic.length === 0;
  const confidence: Confidence = canAssess ? "medium" : "low";

  if (!canAssess) {
    reasoning.push(
      "No channel is recommended: the settings needed to work out a margin are not in place, and a recommendation without them would be a guess.",
    );
  }

  if (input.lead.financeOutstanding === "yes") {
    flags.push("Outstanding finance — settlement figure needed before an offer.");
  }
  if (input.lead.financeOutstanding === "unsure") {
    flags.push("Seller unsure about finance — worth confirming on the call.");
  }

  const latestOdometer = input.mot.find((test) => test.odometer !== null);
  if (
    latestOdometer?.odometer &&
    input.lead.mileageReported &&
    input.lead.mileageReported < latestOdometer.odometer
  ) {
    flags.push(
      `Reported mileage (${input.lead.mileageReported.toLocaleString("en-GB")}) is below the last MOT reading (${latestOdometer.odometer.toLocaleString("en-GB")}). Worth asking about.`,
    );
  }

  return {
    ageAtLandingYears: age,
    targetModelMatch: targetMatch,
    exportEligible: exportBlockers.length === 0 && canAssess,
    exportBlockers,
    projectedMarginExport: null,
    projectedMarginDomestic: null,
    maxBidExport: null,
    maxBidDomestic: null,
    daysToSellEstimate: null,
    score: triage.total,
    confidence,
    recommendedChannel: null,
    reasoning,
    flags,
  };
}
