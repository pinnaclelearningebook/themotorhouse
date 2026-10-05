import "server-only";
import { db, isDatabaseConfigured } from "@/lib/db";

/**
 * Per-identifier rate limiting backed by Postgres.
 *
 * In-memory counters do not work here: serverless instances do not share
 * state, so a limit of 10/min becomes 10/min *per instance* and the real
 * ceiling is unbounded. The api_rate_limits table is the shared store —
 * see the ARCHITECTURE.md section 9 decisions log.
 *
 * One row per request rather than an incrementing counter: inserts do not
 * contend, and counting rows in a window is exact under concurrency.
 */

export interface RateLimitWindow {
  /** Window length in seconds. */
  seconds: number;
  /** Requests permitted within that window. */
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry. Only set when ok is false. */
  retryAfter?: number;
}

/** /api/vehicle/lookup: 10 per minute, 100 per day, per IP. */
export const LOOKUP_WINDOWS: RateLimitWindow[] = [
  { seconds: 60, max: 10 },
  { seconds: 86_400, max: 100 },
];

/**
 * /api/agent/chat: 20 turns per minute, 200 per day, per IP.
 *
 * Looser per minute than the lookup because a conversation is naturally
 * bursty, tighter per day because every turn costs money. The per-session
 * turn cap in settings is the other half of this: this stops one IP
 * opening a hundred conversations, that stops one conversation running a
 * hundred turns.
 */
export const AGENT_WINDOWS: RateLimitWindow[] = [
  { seconds: 60, max: 20 },
  { seconds: 86_400, max: 200 },
];

/**
 * The windowing decision, separated from storage so it can be tested
 * directly. Given the timestamps of prior requests, decide whether
 * another is allowed and, if not, how long until the oldest request in
 * the breached window falls out of it.
 */
export function evaluateWindows(
  times: number[],
  windows: RateLimitWindow[],
  now: number,
): RateLimitResult {
  for (const window of windows) {
    const cutoff = now - window.seconds * 1000;
    const inWindow = times.filter((t) => t >= cutoff);
    if (inWindow.length >= window.max) {
      const oldest = Math.min(...inWindow);
      const retryAfter = Math.max(
        1,
        Math.ceil((oldest + window.seconds * 1000 - now) / 1000),
      );
      return { ok: false, retryAfter };
    }
  }
  return { ok: true };
}

export async function checkRateLimit(
  bucket: string,
  identifier: string,
  windows: RateLimitWindow[] = LOOKUP_WINDOWS,
): Promise<RateLimitResult> {
  // Without a database there is nothing to count against. The caller is
  // in stub mode, where no external request is made anyway.
  if (!isDatabaseConfigured()) return { ok: true };

  const client = db();
  const longest = Math.max(...windows.map((w) => w.seconds));
  const since = new Date(Date.now() - longest * 1000).toISOString();

  const { data, error } = await client
    .from("api_rate_limits")
    .select("occurred_at")
    .eq("bucket", bucket)
    .eq("identifier", identifier)
    .gte("occurred_at", since);

  if (error) throw new Error(`rate limit read failed: ${error.message}`);

  const times = (data ?? []).map((row) =>
    new Date(row.occurred_at as string).getTime(),
  );

  const verdict = evaluateWindows(times, windows, Date.now());
  if (!verdict.ok) return verdict;

  const { error: insertError } = await client
    .from("api_rate_limits")
    .insert({ bucket, identifier });
  if (insertError) {
    throw new Error(`rate limit write failed: ${insertError.message}`);
  }

  return { ok: true };
}

/** Opportunistic cleanup of rows older than the longest window. */
export async function pruneRateLimits(olderThanSeconds = 86_400): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const cutoff = new Date(Date.now() - olderThanSeconds * 1000).toISOString();
  await db().from("api_rate_limits").delete().lt("occurred_at", cutoff);
}
