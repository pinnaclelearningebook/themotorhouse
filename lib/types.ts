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
