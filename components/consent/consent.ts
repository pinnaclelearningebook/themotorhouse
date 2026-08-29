/**
 * Cookie/storage consent state. Stored client-side; nothing non-essential
 * loads until the stored choice is "all". The choice itself lives in
 * localStorage, which is the only thing the site stores in the browser —
 * documented on /cookies.
 */

export type ConsentChoice = "all" | "essential";

const KEY = "tmh-consent";
export const CONSENT_EVENT = "tmh-consent-change";

export function getConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "all" || value === "essential" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Storage unavailable (private mode, blocked) — treat as unset next visit.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

export function clearConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/**
 * useSyncExternalStore adapters. The server snapshot is the sentinel
 * "pending": components render nothing until the client knows the real
 * choice, so there is no hydration mismatch and no banner flash for
 * people who already chose.
 */
export type ConsentSnapshot = ConsentChoice | null | "pending";

export function subscribeToConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

export function getConsentSnapshot(): ConsentSnapshot {
  return getConsent();
}

export function getConsentServerSnapshot(): ConsentSnapshot {
  return "pending";
}
