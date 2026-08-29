"use client";

import { useSyncExternalStore } from "react";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeToConsent,
} from "./consent";

/**
 * The single gate every analytics script must pass through. Nothing
 * renders until the stored consent is "all", and consent withdrawal is
 * observed live.
 *
 * No analytics provider is chosen yet (see "Analytics choice" in
 * PENDING-INFO.md), so the allowed branch is an empty slot. When
 * Plausible or GA4 is picked, its <Script> goes in that branch and
 * inherits the consent blocking for free.
 */
export function AnalyticsGate() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  if (consent !== "all") {
    return null;
  }

  // Analytics provider slot — empty until the choice in PENDING-INFO.md is made.
  return null;
}
