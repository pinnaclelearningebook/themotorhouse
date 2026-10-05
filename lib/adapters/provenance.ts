import "server-only";

/**
 * Provenance check (HPI / Experian AutoCheck).
 *
 * PAID PER CALL. There is no code path that runs this automatically.
 * It is invoked only by a job a human triggers from /admin, and every
 * run is logged with its cost and the actor who pressed the button
 * (ARCHITECTURE.md section 5).
 */
export interface ProvenanceResult {
  financeOutstanding: boolean | null;
  writeOffCategory: string | null;
  stolen: boolean | null;
  mileageAnomaly: boolean | null;
  plateChanges: number | null;
  keepers: number | null;
  raw: unknown;
  costPence: number;
}

export function isProvenanceConfigured(): boolean {
  return Boolean(
    process.env.PROVENANCE_PROVIDER && process.env.PROVENANCE_API_KEY,
  );
}

/** Why the control is disabled, for the dashboard to show verbatim. */
export function provenanceUnavailableReason(): string | null {
  if (process.env.PROVENANCE_PROVIDER && process.env.PROVENANCE_API_KEY) {
    return null;
  }
  return "No provenance provider is configured. Choose HPI or Experian AutoCheck and set PROVENANCE_PROVIDER and PROVENANCE_API_KEY.";
}

export async function runProvenance(
  reg: string,
): Promise<ProvenanceResult | null> {
  if (!isProvenanceConfigured()) return null;
  // Provider wiring lands when an account exists. See PENDING-INFO.md.
  void reg;
  return null;
}
