/**
 * Decision-engine settings.
 *
 * Every constant lives in the `settings` table so Alex can change it
 * from /admin without a deploy (CLAUDE.md section 11). Only the two
 * margin floors are seeded; the rest are unconfirmed and tracked in
 * PENDING-INFO.md under Phase C.
 *
 * Absent settings are NOT defaulted. A decision engine that computes a
 * plausible margin from invented shipping costs is worse than one that
 * refuses, because the first produces a number a person might act on.
 */

export interface Settings {
  margin_floor_export?: number;
  margin_floor_domestic?: number;
  shipping_gbp?: number;
  marine_insurance_gbp?: number;
  cyprus_clearance_gbp?: number;
  cyprus_registration_gbp?: number;
  cyprus_vat_rate?: number;
  recon_default_gbp?: number;
  cra_contingency_pct?: number;
  target_models?: string[];
  days_to_sell_table?: Record<string, number>;
  export_slot_open?: boolean;
  sla_hours?: number;
}

/** Human names, so a flag can tell Alex exactly what he owes. */
export const SETTING_LABELS: Record<keyof Settings, string> = {
  margin_floor_export: "export margin floor",
  margin_floor_domestic: "domestic margin floor",
  shipping_gbp: "shipping cost",
  marine_insurance_gbp: "marine insurance cost",
  cyprus_clearance_gbp: "Cyprus clearance cost",
  cyprus_registration_gbp: "Cyprus registration cost",
  cyprus_vat_rate: "Cyprus VAT rate",
  recon_default_gbp: "default reconditioning allowance",
  cra_contingency_pct: "Consumer Rights Act contingency percentage",
  target_models: "target model list",
  days_to_sell_table: "days-to-sell table",
  export_slot_open: "export capital slot availability",
  sla_hours: "SLA hours",
};

/** What each channel needs before a margin can be computed at all. */
export const LANDED_COST_KEYS = [
  "shipping_gbp",
  "marine_insurance_gbp",
  "cyprus_clearance_gbp",
  "cyprus_registration_gbp",
  "cyprus_vat_rate",
] as const satisfies readonly (keyof Settings)[];

export const DOMESTIC_KEYS = [
  "recon_default_gbp",
  "cra_contingency_pct",
  "margin_floor_domestic",
] as const satisfies readonly (keyof Settings)[];

export function missingSettings(
  settings: Settings,
  keys: readonly (keyof Settings)[],
): (keyof Settings)[] {
  return keys.filter((key) => settings[key] === undefined || settings[key] === null);
}
