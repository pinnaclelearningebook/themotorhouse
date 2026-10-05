/**
 * The settings an operator can edit, and what each one is for.
 *
 * This drives the /admin/settings form, so adding a decision-engine
 * constant means adding it here — the form, the validation and the help
 * text all come from one place.
 *
 * `help` is written for Alex, who is deciding a real number, not for a
 * developer. Where a number is unknown it stays unset: the engine then
 * names it as missing rather than computing a margin from a guess.
 */
export type SettingKind = "money" | "percent" | "integer" | "boolean" | "list";

export interface SettingField {
  key: string;
  label: string;
  kind: SettingKind;
  help: string;
  group: string;
  /** Shown when the value is absent, to say what that costs. */
  absenceCost?: string;
}

export const SETTING_GROUPS = [
  "Margins",
  "Export landed cost",
  "Domestic",
  "Operations",
] as const;

export const SETTING_FIELDS: SettingField[] = [
  {
    key: "margin_floor_export",
    label: "Export margin floor",
    kind: "money",
    group: "Margins",
    help: "The least we will accept on an exported car after every landed cost. Below this, the car is not worth the slot.",
  },
  {
    key: "margin_floor_domestic",
    label: "Domestic margin floor",
    kind: "money",
    group: "Margins",
    help: "The least we will accept on a car bought and sold in the UK, after reconditioning and contingency.",
  },

  {
    key: "shipping_gbp",
    label: "Shipping",
    kind: "money",
    group: "Export landed cost",
    help: "Cost to move one car from the UK compound to the destination port.",
    absenceCost: "No export margin can be calculated.",
  },
  {
    key: "marine_insurance_gbp",
    label: "Marine insurance",
    kind: "money",
    group: "Export landed cost",
    help: "Insurance for the crossing, per car.",
    absenceCost: "No export margin can be calculated.",
  },
  {
    key: "cyprus_clearance_gbp",
    label: "Clearance",
    kind: "money",
    group: "Export landed cost",
    help: "Customs clearance and port handling at the destination.",
    absenceCost: "No export margin can be calculated.",
  },
  {
    key: "cyprus_registration_gbp",
    label: "Registration",
    kind: "money",
    group: "Export landed cost",
    help: "Local registration and plating once the car has landed.",
    absenceCost: "No export margin can be calculated.",
  },
  {
    key: "cyprus_vat_rate",
    label: "VAT rate",
    kind: "percent",
    group: "Export landed cost",
    help: "Destination VAT applied on import, as a percentage.",
    absenceCost: "No export margin can be calculated.",
  },

  {
    key: "recon_default_gbp",
    label: "Default reconditioning",
    kind: "money",
    group: "Domestic",
    help: "What we assume a car needs spent on it before retail, before anyone has looked at it.",
    absenceCost: "No domestic margin can be calculated.",
  },
  {
    key: "cra_contingency_pct",
    label: "Consumer Rights Act contingency",
    kind: "percent",
    group: "Domestic",
    help: "Held back against a return or repair within the first six months, as a percentage of the retail figure.",
    absenceCost: "No domestic margin can be calculated.",
  },

  {
    key: "target_models",
    label: "Target models",
    kind: "list",
    group: "Operations",
    help: "Models where export demand lifts what we can pay. Matched loosely against make and model, one per line.",
    absenceCost: "Every lead is treated as off-target, so no car can qualify for export.",
  },
  {
    key: "export_slot_open",
    label: "Export capital slot free",
    kind: "boolean",
    group: "Operations",
    help: "Turn off when the money is tied up in a car already in transit. No lead will be recommended for export while this is off.",
  },
  {
    key: "sla_hours",
    label: "Response SLA (hours)",
    kind: "integer",
    group: "Operations",
    help: "The inbox marks a lead breached past this. Two hours is what the site promises on every page.",
  },
  {
    key: "days_to_sell_table",
    label: "Expected days to sell",
    kind: "list",
    group: "Operations",
    help: "One per line as model=days, for example Discovery Sport=18. A domestic buy needs to clear within this.",
    absenceCost: "Days-to-sell is not estimated, so the domestic test cannot run.",
  },
];
