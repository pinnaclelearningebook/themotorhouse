"use client";

import { ValuationFormV2 } from "@/components/forms/ValuationFormV2";

/**
 * Exercises the real four-step form, including the real server action
 * and the real database. Kept separate from /valuation so the live form
 * stays on the two-step flow until the switch.
 */
export function FormPreview() {
  return <ValuationFormV2 />;
}
