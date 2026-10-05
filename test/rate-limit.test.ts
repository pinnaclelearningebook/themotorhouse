import { describe, expect, it } from "vitest";
import { evaluateWindows, LOOKUP_WINDOWS } from "../lib/rate-limit";
import { freshDb } from "./db";

const NOW = Date.UTC(2026, 9, 5, 12, 0, 0);
const secondsAgo = (n: number) => NOW - n * 1000;

describe("rate limit windows", () => {
  it("allows a request under both limits", () => {
    const times = [secondsAgo(5), secondsAgo(10)];
    expect(evaluateWindows(times, LOOKUP_WINDOWS, NOW)).toEqual({ ok: true });
  });

  it("denies the eleventh request inside a minute", () => {
    const times = Array.from({ length: 10 }, (_, i) => secondsAgo(i + 1));
    const result = evaluateWindows(times, LOOKUP_WINDOWS, NOW);
    expect(result.ok).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });

  it("ignores requests that have aged out of the minute window", () => {
    // Ten requests, but all older than a minute: the minute limit is
    // clear and the daily limit is nowhere near.
    const times = Array.from({ length: 10 }, (_, i) => secondsAgo(61 + i));
    expect(evaluateWindows(times, LOOKUP_WINDOWS, NOW)).toEqual({ ok: true });
  });

  it("denies on the daily limit even when the minute window is clear", () => {
    const times = Array.from({ length: 100 }, (_, i) => secondsAgo(200 + i * 10));
    const result = evaluateWindows(times, LOOKUP_WINDOWS, NOW);
    expect(result.ok).toBe(false);
    // Retry-after should point into the future but within the day.
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(86_400);
  });

  it("reports retry-after from the oldest request in the breached window", () => {
    // Ten requests, the oldest 30s ago. It leaves the window in 30s.
    const times = [
      secondsAgo(30),
      ...Array.from({ length: 9 }, (_, i) => secondsAgo(i + 1)),
    ];
    const result = evaluateWindows(times, LOOKUP_WINDOWS, NOW);
    expect(result.ok).toBe(false);
    expect(result.retryAfter).toBe(30);
  });

  it("never reports a retry-after below one second", () => {
    const times = Array.from({ length: 10 }, () => secondsAgo(59.9));
    const result = evaluateWindows(times, LOOKUP_WINDOWS, NOW);
    expect(result.retryAfter).toBeGreaterThanOrEqual(1);
  });
});

describe("rate limit storage", () => {
  it("counts only rows for the same bucket and identifier", async () => {
    const db = await freshDb();
    await db.exec(`
      insert into api_rate_limits (bucket, identifier) values
        ('vehicle_lookup', '1.1.1.1'),
        ('vehicle_lookup', '1.1.1.1'),
        ('vehicle_lookup', '2.2.2.2'),
        ('other_bucket',   '1.1.1.1');
    `);
    const { rows } = await db.query<{ count: number }>(
      `select count(*)::int as count from api_rate_limits
       where bucket = 'vehicle_lookup' and identifier = '1.1.1.1'`,
    );
    expect(rows[0].count).toBe(2);
    await db.close();
  });
});

describe("vehicle cache window", () => {
  it("returns a vehicle fetched inside 24h and not one outside it", async () => {
    const db = await freshDb();
    await db.exec(`
      insert into vehicles (reg, make, fetched_at) values
        ('FRESH11', 'LAND ROVER', now() - interval '2 hours'),
        ('STALE11', 'LEXUS',      now() - interval '30 hours');
    `);
    const { rows } = await db.query<{ reg: string }>(
      `select reg from vehicles
       where fetched_at >= now() - interval '24 hours' order by reg`,
    );
    expect(rows.map((r) => r.reg)).toEqual(["FRESH11"]);
    await db.close();
  });

  it("replaces a cached row on re-fetch rather than duplicating it", async () => {
    const db = await freshDb();
    await db.exec(`
      insert into vehicles (reg, make) values ('AB12CDE', 'LAND ROVER');
      insert into vehicles (reg, make, fetched_at)
        values ('AB12CDE', 'LAND ROVER', now())
        on conflict (reg) do update
          set make = excluded.make, fetched_at = excluded.fetched_at;
    `);
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int as count from vehicles where reg = 'AB12CDE'",
    );
    expect(rows[0].count).toBe(1);
    await db.close();
  });
});
