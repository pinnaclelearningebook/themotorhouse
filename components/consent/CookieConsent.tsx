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
 * the two choices carry equal visual weight — identical buttons, so
 * neither is the one the design is nudging you towards.
 *
 * One line on a desktop. It was three deep, which for a notice nobody
 * came for is a third of a laptop screen; the copy is now as short as
 * it can be while still saying what happens and that the site works
 * either way.
 *
 * Renders only after mount (no stored choice yet), so there is no
 * server/client mismatch and no layout shift — it overlays, it does
 * not push content.
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
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-paper/40 px-4 text-sm font-medium transition-colors duration-200 hover:border-paper hover:bg-ink-soft";

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="on-ink step-in fixed inset-x-0 bottom-0 z-50 border-t border-line-dark bg-ink px-6 py-3 text-paper md:px-10"
    >
      <div className="mx-auto flex w-full max-w-300 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <p className="text-sm text-paper/85">
          Analytics only, and nothing loads unless you allow it.{" "}
          <Link
            href="/cookies"
            className="inline-flex min-h-11 items-center text-paper sm:min-h-0"
          >
            <span className="link-draw">
              More detail
            </span>
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
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
