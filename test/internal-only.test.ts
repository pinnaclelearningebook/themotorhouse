import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What the dashboard knows and the seller never sees.
 *
 * CLAUDE.md section 11: "The seller never sees `export_eligible`, a
 * channel, a score, or a margin, and is never told which route their
 * car took."
 *
 * The lead page shows all of it, correctly, which is exactly why this
 * needs a test rather than care. Those terms are in the vocabulary of
 * the codebase now; the easiest mistake in the world is to pass a
 * score into a component that is also used on a public page, or to
 * add a field to a seller email because it was in scope.
 *
 * So the rule is directional. Admin may say anything. Seller-facing
 * routes, the public components they use, and the two emails that
 * reach a seller may not.
 */

/** Terms that are internal by definition. */
const INTERNAL = [
  /\bexport[_\s-]?eligible\b/i,
  /\brecommended[_\s-]?channel\b/i,
  /\bchannel[_\s-]?decided\b/i,
  /\bmax[_\s-]?bid\b/i,
  /\bprojected[_\s-]?margin\b/i,
  /\blanded[_\s-]?cost\b/i,
  /\benrichment\b/i,
  /\bpending_enrichment\b/i,
];

/**
 * "score" and "margin" are words with innocent uses — a reading
 * score, a page margin — so they are matched only where they look
 * like the lead's.
 */
const INTERNAL_NARROW = [
  // Property access, which is how it leaks into a component.
  /\b(?:lead|enrichment|row)\.score\b/i,
  /\bscore\s*[:=]\s*(?:lead|enrichment|row)/i,
  /\bconfidence\s*[:=]\s*(?:lead|enrichment|row)/i,
  // And prose, which is how it leaks into an email. The first version
  // of this test only had the property forms, and a deliberately
  // planted "Your lead score is 95" in the seller confirmation sailed
  // straight through it.
  /\b(?:lead|your|their)\s+score\b/i,
  /\bscore\s+(?:is|of|was)\s+\d/i,
  /\b(?:projected|profit|our)\s+margin\b/i,
];

/** Everything a seller can reach or receive. */
const SELLER_FACING_DIRS = [
  join("app", "(site)"),
  join("components", "sections"),
  join("components", "forms"),
  join("components", "blog"),
  join("content"),
];

/** Shared components that public pages import. */
const SHARED_UI = join("components", "ui");

/**
 * lib/email.ts is not scanned whole, and agent/prompt.md is not
 * scanned at all. Both for the same reason, and both covered another
 * way.
 *
 * The mailer holds three emails: two operator alerts, which carry the
 * score and the channel because that is their entire job, and one
 * seller confirmation, which must not. Only the last is scanned —
 * sliced out below — because a file-level scan would either fail
 * forever or have to be switched off.
 *
 * The prompt states the prohibition, so it necessarily names the
 * terms, the way a comment does. What matters is not what the prompt
 * says but what reaches a seller, and that is `INTERNAL_PATTERNS` in
 * agent/guards.ts, which blocks the same vocabulary on her generated
 * output. Asserted below rather than taken on trust.
 */
const SELLER_FACING_FILES = [join("lib", "thank-you-state.ts")];

const EXT = new Set([".ts", ".tsx", ".mdx", ".md"]);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXT.has(extname(full))) out.push(full);
  }
  return out;
}

/**
 * Comments are not shipped, and the rule most needs writing down in
 * the files it governs. Same exemption as the trademark test.
 */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
}

function offenders(files: string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const text = code(readFileSync(file, "utf8"));
    for (const rule of [...INTERNAL, ...INTERNAL_NARROW]) {
      const match = rule.exec(text);
      if (match) {
        hits.push(
          `${file}: …${text.slice(Math.max(0, match.index - 40), match.index + 60).replace(/\s+/g, " ")}…`,
        );
        break;
      }
    }
  }
  return hits;
}

describe("internal-only data", () => {
  it("appears nowhere a seller can reach", () => {
    const files = SELLER_FACING_DIRS.flatMap(walk);
    expect(
      files.length,
      "no seller-facing files scanned — the paths are wrong",
    ).toBeGreaterThan(40);
    expect(offenders(files)).toEqual([]);
  });

  it("appears in no component a public page shares", () => {
    const files = walk(SHARED_UI);
    expect(files.length).toBeGreaterThan(5);
    expect(offenders(files)).toEqual([]);
  });

  it("appears nowhere in the seller's confirmation email", () => {
    const files = SELLER_FACING_FILES.filter(existsSync);
    expect(files.length).toBe(SELLER_FACING_FILES.length);
    expect(offenders(files)).toEqual([]);

    // The mailer, sliced to the one function a seller receives.
    const mailer = readFileSync(join("lib", "email.ts"), "utf8");
    const start = mailer.indexOf("export async function sendSellerConfirmation");
    const end = mailer.indexOf("export interface EnrichmentAlert");
    expect(start, "sendSellerConfirmation not found").toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const sellerEmail = code(mailer.slice(start, end));
    for (const rule of [...INTERNAL, ...INTERNAL_NARROW]) {
      expect(
        rule.test(sellerEmail),
        `the seller confirmation matches ${rule}`,
      ).toBe(false);
    }
  });

  it("is blocked on the assistant's output, not just in her prompt", () => {
    // The prompt names the terms in order to forbid them, so scanning
    // it proves nothing. The guard is what a seller actually meets.
    const guards = readFileSync(join("agent", "guards.ts"), "utf8");
    expect(guards).toMatch(/INTERNAL_PATTERNS/);
    // Substrings of the patterns themselves, so this reads as "the
    // guard list still covers these words" rather than as a regex
    // about a regex.
    for (const term of [
      "export[- ]eligible",
      "domestic channel",
      "recommended channel",
      "bid",
      "margin",
      "score",
    ]) {
      expect(guards, `guards.ts no longer blocks "${term}"`).toContain(term);
    }
  });

  it("is marked as internal where it legitimately appears", () => {
    // The lead page is allowed all of it, and has to say so: a number
    // nobody has labelled is a number somebody eventually quotes.
    const page = readFileSync(
      join("app", "admin", "(workspace)", "leads", "[id]", "page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/InternalOnly/);
    const wrapper = readFileSync(
      join("components", "admin", "LeadTabs.tsx"),
      "utf8",
    );
    expect(wrapper).toMatch(/Internal only/);
    expect(wrapper).toMatch(/[Nn]ever shown to the seller/);
  });

  it("catches the terms it is written for", () => {
    const caught = [
      "const eligible = lead.export_eligible;",
      "recommendedChannel: row.recommended_channel,",
      "<p>Your max bid is …</p>",
      "const m = projectedMargin(lead);",
      "enrichment.score",
      "lead.score",
    ];
    for (const sample of caught) {
      expect(
        [...INTERNAL, ...INTERNAL_NARROW].some((r) => r.test(sample)),
        `should be caught: ${sample}`,
      ).toBe(true);
    }
    const allowed = [
      "A firm offer within two hours.",
      "className=\"mt-4 margin\"",
      "Free collection anywhere in mainland UK",
      "export function Hero() {",
      "export default function Page() {",
      "const score = post.readingMinutes;",
    ];
    for (const sample of allowed) {
      expect(
        [...INTERNAL, ...INTERNAL_NARROW].some((r) => r.test(sample)),
        `should be allowed: ${sample}`,
      ).toBe(false);
    }
  });
});
