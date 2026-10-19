import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// The script module itself, not a copy of its logic: a test that
// re-implements the guard proves nothing about the thing that runs.
import {
  OUR_SOURCES,
  TARGETS,
  designationRefusalReason,
  refusalReason,
  resolveTarget,
} from "../scripts/lib/target.mjs";

/**
 * The guard that should have existed on 15 October 2026.
 *
 * Six fabricated leads went into the production database that day.
 * Preview and production shared one Supabase project, so a row
 * labelled `admin-test` would have been hidden on the preview that
 * needed to see it — the labelling convention was followed and the
 * rows landed in production anyway.
 *
 * Separate projects fix the sharing. This fixes the part separate
 * projects do not: nothing stops a script pointed at the wrong URL,
 * and "I checked" is not a control. So the refusal is tested the way
 * the thing it guards would be — every arm, by its outcome.
 */

const PRODUCTION = "https://prodref.supabase.co";
const STAGING = "https://stageref.supabase.co";

/** A target that should be allowed, which each case then spoils. */
function allowed(over: Record<string, unknown> = {}) {
  return {
    name: "staging",
    url: STAGING,
    productionUrl: PRODUCTION,
    environmentMarker: "staging",
    realLeadCount: 0,
    ...over,
  };
}

describe("the production guard", () => {
  it("allows a staging project that has proved itself", () => {
    expect(refusalReason(allowed())).toBeNull();
  });

  it("refuses the target named production", () => {
    expect(refusalReason(allowed({ name: "production", url: PRODUCTION }))).toMatch(
      /never writes to production/,
    );
  });

  it("refuses a target pointed at production's URL under another name", () => {
    // The actual failure mode: the name is right, the URL is not,
    // because somebody copied a key and not the one beside it.
    expect(refusalReason(allowed({ url: PRODUCTION }))).toMatch(
      /points at the production project/,
    );
  });

  it("refuses a project that has not been designated", () => {
    expect(refusalReason(allowed({ environmentMarker: null }))).toMatch(
      /does not identify itself as staging[\s\S]*not set/,
    );
    expect(refusalReason(allowed({ environmentMarker: "production" }))).toMatch(
      /does not identify itself as staging[\s\S]*"production"/,
    );
  });

  it("refuses a project holding leads that are not ours, marker or no marker", () => {
    // The backstop. Every other rule can be satisfied by one mistyped
    // flag; a row somebody is waiting for a call about cannot be.
    const reason = refusalReason(allowed({ realLeadCount: 9 }));
    expect(reason).toMatch(/holds 9 leads/);
    expect(reason).toMatch(/not a scratch database/);
  });

  it("counts a lead with no source as a real seller", () => {
    // The public form writes no source. If this arm is ever relaxed
    // to "source is null means ours", the guard stops working on the
    // only rows that matter.
    expect(OUR_SOURCES).not.toContain(null);
    expect(OUR_SOURCES).toEqual(["admin-test", "staging-seed"]);
    const guard = readFileSync(join("scripts", "lib", "target.mjs"), "utf8");
    expect(guard).toMatch(/source\.is\.null/);
  });

  it("requires emptiness to designate, and the marker afterwards", () => {
    // Bootstrap cannot require the marker — writing it is the point —
    // so emptiness carries the whole weight at that one call site.
    expect(designationRefusalReason(allowed({ environmentMarker: null }))).toBeNull();
    expect(designationRefusalReason(allowed({ realLeadCount: 1 }))).toMatch(
      /holds 1 lead\b/,
    );
    expect(designationRefusalReason(allowed({ name: "production" }))).toMatch(
      /never writes to production/,
    );
  });
});

describe("choosing a target", () => {
  const env = {
    SUPABASE_URL: PRODUCTION,
    SUPABASE_SERVICE_ROLE_KEY: "prod-key",
    STAGING_SUPABASE_URL: STAGING,
    STAGING_SUPABASE_SERVICE_ROLE_KEY: "stage-key",
  };

  it("never picks one for you", () => {
    // A script that chooses a database when nobody named one is a
    // script that will eventually choose the wrong one.
    expect(() => resolveTarget(undefined, env)).toThrow(/No target named/);
    expect(() => resolveTarget("", env)).toThrow(/No target named/);
  });

  it("rejects a name it does not know rather than falling back", () => {
    expect(() => resolveTarget("prod", env)).toThrow(/Unknown target "prod"/);
  });

  it("says which variable is missing instead of guessing", () => {
    expect(() => resolveTarget("staging", { SUPABASE_URL: PRODUCTION })).toThrow(
      /STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("keeps the two projects' variables entirely separate", () => {
    // Sharing one variable between environments is how a preview ends
    // up writing to production, which is the thing being fixed.
    const names = Object.values(TARGETS).flatMap((spec) => Object.values(spec));
    expect(new Set(names).size).toBe(names.length);
  });

  it("reads production's URL even when resolving staging", () => {
    // Rule 2 needs it, and a guard that cannot see production cannot
    // notice that it is pointed at it.
    expect(resolveTarget("staging", env).productionUrl).toBe(PRODUCTION);
  });
});

describe("every script that writes fabricated data", () => {
  /**
   * Found by reading the directory, not by listing the files here. A
   * list is a thing somebody adds a script without updating — which
   * is the same shape of mistake as the one this guards against.
   */
  const SEEDING = /seed|fixture|demo|sample|bootstrap/i;

  const scripts = readdirSync("scripts")
    .filter((name) => name.endsWith(".mjs"))
    .filter((name) => SEEDING.test(name));

  it("is found by this test", () => {
    expect(scripts.length).toBeGreaterThan(0);
  });

  for (const name of scripts) {
    it(`${name} refuses a target it has not checked`, () => {
      const source = readFileSync(join("scripts", name), "utf8");
      expect(source, `${name} does not import the guard`).toMatch(
        /from "\.\/lib\/target\.mjs"/,
      );
      // The call, not the import. Matching the name alone passes on a
      // script that imports the guard and then never awaits it —
      // checked by deleting the call and watching this fail.
      expect(source, `${name} never calls the guard`).toMatch(
        /await assert(?:Writable|SafeToDesignate)\(/,
      );
      // And does not reach for production's variables behind its back.
      expect(source, `${name} reads production's key directly`).not.toMatch(
        /SUPABASE_SERVICE_ROLE_KEY/,
      );
    });
  }
});
