import "server-only";

/**
 * Is the model answering?
 *
 * A key that exists is not the same as a key with credit on it. When
 * Anthropic or ElevenLabs is out of credit, rate-limiting us or simply
 * down, every turn fails — and the seller's experience is a launcher
 * that invites them in and then apologises. The form is unaffected
 * either way, so the right answer is to stop offering her at all: a
 * seller who never saw her does not need to be told she is broken.
 *
 * A counter in module memory, not a row in the database. It is
 * per-instance and imperfect — a cold start forgets everything, and two
 * instances can disagree — and that is an acceptable trade for a
 * component whose only job is to stop offering an optional extra. The
 * alternative is a write on every failed turn, which is a cost paid on
 * the worst day to make a nice-to-have slightly tidier.
 */

/** Consecutive failures before she stops being offered. */
const TRIP_AFTER = 3;
/** How long she stays unoffered once tripped. */
const COOL_OFF_MS = 5 * 60 * 1000;

let consecutiveFailures = 0;
let trippedAt = 0;

export function recordAgentFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= TRIP_AFTER) {
    trippedAt = Date.now();
    console.error(
      `[agent] ${consecutiveFailures} turns failed in a row — not offering her for ${
        COOL_OFF_MS / 60000
      } minutes`,
    );
  }
}

export function recordAgentSuccess(): void {
  consecutiveFailures = 0;
  trippedAt = 0;
}

export function isAgentHealthy(): boolean {
  if (!trippedAt) return true;
  if (Date.now() - trippedAt < COOL_OFF_MS) return false;
  // The cool-off is over. One more turn gets to decide.
  consecutiveFailures = 0;
  trippedAt = 0;
  return true;
}

/** Test seam. Never called from application code. */
export function resetAgentHealth(): void {
  consecutiveFailures = 0;
  trippedAt = 0;
}
