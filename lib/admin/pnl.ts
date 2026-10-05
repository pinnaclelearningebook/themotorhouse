import "server-only";

/**
 * Per-car profit and loss, from actual money only.
 *
 * The decision engine's projected margins are deliberately not used
 * here. A projection shown next to a realised figure, in the same column,
 * under the same heading, becomes a realised figure in the reader's head
 * — and these numbers are what Alex judges whether the export channel is
 * worth running. So this module reports what was actually paid, actually
 * spent and actually received, and says plainly which of the three it
 * does not yet know.
 *
 * Purchase price is the accepted offer rather than a separate field: the
 * promise is that the offer does not change, so a second editable copy
 * would only create somewhere for the two to disagree.
 */

export interface CostLine {
  kind: string;
  amount: number;
}

export interface CarPnl {
  /** The accepted offer. Null until an offer is accepted. */
  purchase: number | null;
  /** Sum of logged cost lines. Zero recorded is not the same as none. */
  costs: number;
  costLines: CostLine[];
  costsRecorded: boolean;
  /** leads.sold_price. Null until the car is sold. */
  proceeds: number | null;
  /** proceeds − purchase − costs, or null when either end is unknown. */
  margin: number | null;
  /** True when a margin exists but no costs have been logged against it. */
  marginProvisional: boolean;
  /** What is missing, in words, for the UI to show instead of a number. */
  missing: string[];
}

export interface PnlInputs {
  acceptedOffer: number | null;
  soldPrice: number | null;
  costLines: CostLine[];
}

export function carPnl({
  acceptedOffer,
  soldPrice,
  costLines,
}: PnlInputs): CarPnl {
  const costs = costLines.reduce((total, line) => total + line.amount, 0);
  const costsRecorded = costLines.length > 0;

  const missing: string[] = [];
  if (acceptedOffer === null) missing.push("no accepted offer yet");
  if (soldPrice === null) missing.push("not sold yet");
  if (!costsRecorded) missing.push("no costs logged");

  const canCompute = acceptedOffer !== null && soldPrice !== null;
  const margin = canCompute ? soldPrice - acceptedOffer - costs : null;

  return {
    purchase: acceptedOffer,
    costs,
    costLines,
    costsRecorded,
    proceeds: soldPrice,
    margin,
    marginProvisional: margin !== null && !costsRecorded,
    missing,
  };
}

/** Whole pounds, mono-ready. Negative margins read as −£1,200. */
export function money(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}£${Math.abs(amount).toLocaleString("en-GB")}`;
}
