export type FinanceOutstanding = "yes" | "no" | "unsure";
export type ServiceHistory = "full" | "partial" | "none";
export type SellTimeline =
  | "asap"
  | "this-month"
  | "next-few-months"
  | "just-researching";
export type Outcome =
  | "bought"
  | "declined"
  | "lost"
  | "no-response"
  | "researching";

export interface Submission {
  id: string;
  createdAt: string;
  reg: string;
  make: string | null;
  model: string | null;
  derivative: string | null;
  year: number | null;
  mileage: number;
  postcode: string;
  name: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
  financeOutstanding: FinanceOutstanding | null;
  serviceHistory: ServiceHistory | null;
  keepers: number | null;
  conditionNotes: string | null;
  /** Empty until the seller photo upload flow exists — see PENDING-INFO.md. */
  photos: string[];
  /** The most commercially valuable field on the site. Never optional in step 2. */
  sellTimeline: SellTimeline | null;
  indicativeOffer: number | null;
  firmOffer: number | null;
  offerSentAt: string | null;
  /** Derived: under 5 years old + target model. */
  exportEligible: boolean | null;
  outcome: Outcome | null;
  /** The commercially important field — when to follow up. */
  nextContactDate: string | null;
  notes: string | null;
}

/**
 * Vehicle identity as returned by /api/vehicle/lookup.
 *
 * `model` is nullable and frequently null: DVLA VES has no model field at
 * all, and DVSA MOT history — which does — holds nothing for a vehicle
 * under ~3 years old. See ARCHITECTURE.md section 3.
 */
export interface VehicleIdentity {
  reg: string;
  make: string | null;
  model: string | null;
  derivative: string | null;
  colour: string | null;
  fuel: string | null;
  engineCc: number | null;
  yearOfManufacture: number | null;
  firstRegistered: string | null;
  taxStatus: string | null;
  taxDue: string | null;
  motStatus: string | null;
  motExpiry: string | null;
  co2: number | null;
  euroStatus: string | null;
  typeApproval: string | null;
  wheelplan: string | null;
}

export type MotDefectType = "advisory" | "minor" | "major" | "dangerous" | "fail";

export interface MotDefect {
  type: MotDefectType;
  text: string;
}

export interface MotTest {
  testDate: string | null;
  result: string | null;
  expiryDate: string | null;
  odometer: number | null;
  odometerUnit: string | null;
  defects: MotDefect[];
}

export interface VehicleLookup {
  vehicle: VehicleIdentity | null;
  mot: MotTest[];
  source: "live" | "cache" | "stub";
  /** True when DVLA answered but MOT history did not. */
  motUnavailable?: boolean;
}
