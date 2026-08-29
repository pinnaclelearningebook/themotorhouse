"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  setConsent,
  subscribeToConsent,
} from "./consent";

/**
 * The consent banner. Quiet, bottom of the viewport, no modal wall, and
 * the two choices carry equal visual weight. Renders only after mount
 * (no stored choice yet), so there is no server/client mismatch and no
 * layout shift — it overlays, it does not push content.
 */
export function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  if (consent !== null) {
    return null;
  }

  const choiceButton =
    "rounded border border-paper/40 px-5 py-2.5 text-sm font-medium transition-colors duration-200 hover:border-paper hover:bg-ink-soft";

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="on-ink step-in fixed inset-x-0 bottom-0 z-50 border-t border-line-dark bg-ink p-5 text-paper"
    >
      <div className="mx-auto flex w-full max-w-300 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-paper/80">
          We would like to use analytics to understand how the site is used.
          Nothing loads unless you allow it, and the site works fully either
          way. <Link href="/cookies" className="link-draw text-paper">More detail</Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => setConsent("essential")}
            className={choiceButton}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => setConsent("all")}
            className={choiceButton}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
