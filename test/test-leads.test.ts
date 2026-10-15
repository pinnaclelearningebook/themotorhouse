import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_REGISTRATIONS } from "@/lib/admin/exclusions";
import { TEST_SOURCE } from "@/lib/admin/voice-test";

/**
 * Our own test submissions must never look like sellers.
 *
 * On 15 October 2026 nine TE57VOX rows were in the Pipeline, eight of
 * them counted as real leads. The query had always filtered
 * `source != 'admin-test'` and was never wrong — the rows simply had
 * no source, because they went through the real public form by hand
 * while voice was being debugged. Nothing about them said "test"
 * except the registration.
 *
 * Hence two rules and this file: the filter has to be applied by
 * every lead listing, and a reserved plate has to be excluded whatever
 * route the row arrived by.
 */

/** Every admin module that lists leads for a human to act on. */
const LISTINGS = ["inbox.ts", "pipeline.ts", "followups.ts"];

describe("test leads", () => {
  it("are excluded by every admin listing", () => {
    for (const file of LISTINGS) {
      const source = readFileSync(join("lib/admin", file), "utf8");
      expect(
        source,
        `${file} lists leads without excludeTestLeads`,
      ).toMatch(/excludeTestLeads\(/);
    }
  });

  it("has no listing filtering by hand instead", () => {
    // A call site that reimplements the filter is one that can drift
    // from the others, which is how only one of the two rules ended
    // up being applied in the first place.
    for (const file of LISTINGS) {
      const source = readFileSync(join("lib/admin", file), "utf8");
      expect(source, `${file} rolls its own filter`).not.toMatch(
        /source\.neq\./,
      );
    }
  });

  it("excludes by source and by registration, not just source", () => {
    const source = readFileSync("lib/admin/exclusions.ts", "utf8");
    expect(source).toMatch(new RegExp(`source\\.neq\\.\\$\\{TEST_SOURCE\\}`));
    expect(source).toMatch(/\.not\("reg", "in"/);
    // The null arm must survive: a genuine lead has no source, so
    // dropping it would filter out every real seller.
    expect(source).toMatch(/source\.is\.null/);
  });

  it("reserves a registration that cannot be a real plate in use", () => {
    expect(TEST_REGISTRATIONS.length).toBeGreaterThan(0);
    for (const reg of TEST_REGISTRATIONS) {
      expect(reg).toMatch(/^[A-Z0-9]{2,8}$/);
    }
    expect(TEST_SOURCE).toBe("admin-test");
  });

  it("finds no other admin listing that forgot both rules", () => {
    // Anything new under lib/admin that queries leads for a list has
    // to go through the helper. Caught here rather than in the
    // Pipeline three weeks later.
    const missed: string[] = [];
    for (const file of readdirSync("lib/admin")) {
      if (!file.endsWith(".ts")) continue;
      if (["exclusions.ts", "voice-test.ts"].includes(file)) continue;
      const source = readFileSync(join("lib/admin", file), "utf8");
      // A single-row lookup by id is fine; a list is not.
      const lists = /\.from\("leads"\)[\s\S]{0,400}?\.limit\(/.test(source);
      if (lists && !/excludeTestLeads/.test(source)) missed.push(file);
    }
    expect(missed).toEqual([]);
  });
});
