"use client";

import { clearConsent } from "./consent";

/** Clears the stored choice, which brings the consent banner back. */
export function ManageConsentButton() {
  return (
    <button
      type="button"
      onClick={() => clearConsent()}
      className="inline-flex min-h-11 items-center rounded border border-line px-5 text-sm font-medium transition-colors duration-200 hover:border-oxblood"
    >
      Change my cookie choice
    </button>
  );
}
