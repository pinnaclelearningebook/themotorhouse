import "server-only";

/**
 * Trade/retail valuation (UK Vehicle Data, CheckCarDetails, or CAP HPI).
 *
 * PAID PER CALL. Same rule as provenance: no automatic path, triggered
 * only by a human from /admin, cost logged per run.
 */
export interface ValuationResult {
  trade: number | null;
  private: number | null;
  retail: number | null;
  source: string;
  costPence: number;
  raw: unknown;
}

export function isValuationConfigured(): boolean {
  return Boolean(
    process.env.VALUATION_PROVIDER && process.env.VALUATION_API_KEY,
  );
}

export function valuationUnavailableReason(): string | null {
  if (process.env.VALUATION_PROVIDER && process.env.VALUATION_API_KEY) {
    return null;
  }
  return "No valuation provider is configured. Choose a provider and set VALUATION_PROVIDER and VALUATION_API_KEY.";
}

export async function runValuation(
  reg: string,
  mileage: number,
): Promise<ValuationResult | null> {
  if (!isValuationConfigured()) return null;
  // Provider wiring lands when an account exists. See PENDING-INFO.md.
  void reg;
  void mileage;
  return null;
}
