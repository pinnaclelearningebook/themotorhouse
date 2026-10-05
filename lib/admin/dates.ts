import "server-only";

/**
 * Date defaults for the admin forms.
 *
 * These live outside the components deliberately. Reading the clock while
 * rendering is impure — the same render would produce a different result
 * a day later — so the value is resolved in the data layer and passed in,
 * which is also where "an offer is good for seven days" belongs.
 */

const DAY = 86_400_000;

/** Today in ISO form, for a date input's default. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * How long a recorded offer is good for by default.
 *
 * Seven days, matching the validity stated on the public site. Shortening
 * it here without changing the site would mean telling a seller one thing
 * and recording another.
 */
export const OFFER_VALID_DAYS = 7;

export function offerValidUntilIso(): string {
  return new Date(Date.now() + OFFER_VALID_DAYS * DAY)
    .toISOString()
    .slice(0, 10);
}
