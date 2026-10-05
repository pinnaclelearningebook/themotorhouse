import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The two constraints that matter most in this repository, enforced by
 * the test suite rather than by remembering to run a grep.
 *
 *   1. No code path calls a paid API automatically. Provenance and
 *      valuation cost money per call and are only ever run by a human
 *      pressing a button in /admin.
 *   2. No code path makes, sends or calculates an offer. The decision
 *      engine recommends; a person types the number.
 *
 * Both come from CLAUDE.md sections 1 and 17. If someone adds a call to
 * runProvenance from the enrichment pipeline, this fails before it ships.
 */

const ROOTS = ["app", "lib", "components", "config"];
const ROOT_DIR = process.cwd();

/** Where a paid adapter may legitimately be called from. */
const PAID_CALL_ALLOWED = [
  /^lib\/adapters\//, // the definitions themselves
  /^app\/admin\//, // human-triggered from the dashboard
  /^app\/api\/admin\//, // the routes those buttons hit
];

/** Where channel, score and eligibility may appear. Never seller-facing. */
const INTERNAL_ONLY_ALLOWED = [
  /^lib\//,
  /^app\/admin\//,
  /^components\/admin\//, // admin UI is internal by definition
  /^config\/settings-schema\.ts$/,
  /^app\/api\/admin\//,
  /^app\/api\/cron\//,
  /^app\/actions\//,
];

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        out.push(relative(ROOT_DIR, full));
      }
    }
  };
  for (const root of ROOTS) walk(join(ROOT_DIR, root));
  return out;
}

/**
 * Comments describing a rule must not trip the rule. Strips block and
 * line comments before any pattern is applied.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function allowed(file: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(file));
}

const FILES = sourceFiles().map((file) => ({
  file,
  code: stripComments(readFileSync(join(ROOT_DIR, file), "utf8")),
}));

describe("no automatic paid API calls", () => {
  it("finds at least one source file, so the walk is not silently empty", () => {
    expect(FILES.length).toBeGreaterThan(30);
  });

  it("calls runProvenance only from an adapter or /admin", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /\brunProvenance\s*\(/.test(code) && !allowed(file, PAID_CALL_ALLOWED),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("calls runValuation only from an adapter or /admin", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /\brunValuation\s*\(/.test(code) && !allowed(file, PAID_CALL_ALLOWED),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("never imports a paid adapter into the enrichment pipeline or cron", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /^(lib\/decision\/|app\/api\/cron\/)/.test(file) &&
        /from\s+["'].*adapters\/(provenance|valuation)["']/.test(code),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("guards both adapters behind an explicit configuration check", () => {
    for (const name of ["provenance", "valuation"]) {
      const source = readFileSync(
        join(ROOT_DIR, `lib/adapters/${name}.ts`),
        "utf8",
      );
      expect(source, name).toMatch(/if \(!is\w+Configured\(\)\) return null;/);
    }
  });
});

describe("no offer path", () => {
  it("defines no function that makes, sends or calculates an offer", () => {
    const banned =
      /\b(make|send|create|generate|calculate|suggest|auto)[A-Za-z]*Offer\s*[=(]/i;
    const offenders = FILES.filter(({ code }) => banned.test(code)).map(
      ({ file }) => file,
    );
    expect(offenders).toEqual([]);
  });

  it("writes to the offers table only from /admin", () => {
    const offenders = FILES.filter(
      ({ file, code }) =>
        /from\(["']offers["']\)/.test(code) &&
        !allowed(file, [/^app\/admin\//, /^app\/api\/admin\//]),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("returns a max bid, never an offer amount, from the decision engine", () => {
    const source = readFileSync(
      join(ROOT_DIR, "lib/decision/score.ts"),
      "utf8",
    );
    expect(source).toMatch(/maxBidExport/);
    expect(source).not.toMatch(/\boffer(Amount|Price|Value)\b/i);
  });
});

describe("decision output stays internal", () => {
  it("never renders channel, eligibility or score in seller-facing code", () => {
    const internal = /\b(exportEligible|export_eligible|recommendedChannel|recommended_channel|channel_decided)\b/;
    const offenders = FILES.filter(
      ({ file, code }) =>
        internal.test(code) && !allowed(file, INTERNAL_ONLY_ALLOWED),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});

describe("the admin dev bypass cannot reach production", () => {
  it("is guarded by NODE_ENV === development", () => {
    const source = readFileSync(join(ROOT_DIR, "lib/admin/auth.ts"), "utf8");
    const bypass = source.indexOf("ADMIN_DEV_BYPASS");
    expect(bypass, "ADMIN_DEV_BYPASS should exist or this test is stale")
      .toBeGreaterThan(-1);
    // The NODE_ENV check must be in the same condition, before it.
    const guard = source.lastIndexOf(
      'process.env.NODE_ENV === "development"',
      bypass,
    );
    expect(guard).toBeGreaterThan(-1);
    expect(bypass - guard).toBeLessThan(120);
  });

  it("is the only bypass in the admin auth path", () => {
    const source = stripComments(
      readFileSync(join(ROOT_DIR, "lib/admin/auth.ts"), "utf8"),
    );
    const returnsSession = source.match(/return \{ email/g) ?? [];
    // One for the dev bypass, one for the real path. A third would mean
    // someone added another way in.
    expect(returnsSession.length).toBe(2);
  });
});

describe("the decision engine is pure", () => {
  it("does no IO", () => {
    const source = stripComments(
      readFileSync(join(ROOT_DIR, "lib/decision/score.ts"), "utf8"),
    );
    expect(source).not.toMatch(/\bawait\b/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bdb\s*\(\)/);
  });
});
