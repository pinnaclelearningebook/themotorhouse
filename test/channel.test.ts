import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The seller is never told which channel their car went to.
 *
 * CLAUDE.md section 11: "The seller never sees `export_eligible`, a
 * channel, a score, or a margin, and is never told which route their
 * car took. The site is a car buying service; the channel is how we
 * make it work, not something the seller is asked to care about."
 *
 * It is a rule that erodes by sounding helpful. `/export` closed with
 * "We will tell you honestly whether yours is an export car or a UK
 * trade car, and price it accordingly" — written as candour, and a
 * direct promise to do the one thing section 11 forbids. It survived a
 * rebuild because it read well.
 *
 * So the ban is mechanical now. The page may explain *why* export
 * demand exists, which is lever 5 and the reason /export is there at
 * all. It may not tell a seller where their particular car is going.
 *
 * Source and build output both, because the build carries generated
 * metadata and flight data the source does not.
 */

/**
 * Phrasings that promise a seller their own car's routing. Deliberately
 * narrow: "export demand", "the export route closes", "cars we export"
 * are all about the market and all allowed.
 */
const BANNED = [
  /\b(your|yours)\b[^.?!]{0,60}\b(is|as)\b[^.?!]{0,30}\b(an?\s+)?export\s+car\b/i,
  /\bexport\s+car\s+or\s+an?\s+UK\s+trade\s+car\b/i,
  /\bwe(?:'ll| will)\s+tell\s+you[^.?!]{0,60}\bexport\b/i,
  /\byour\s+car\s+(is|will be)\s+(going\s+)?(for\s+)?export(ed)?\b/i,
  /\bexport[_\s-]?eligible\b/i,
  /\brecommended[_\s-]?channel\b/i,
];

const SOURCE_DIRS = ["app", "components", "content"];
const SOURCE_EXT = new Set([".ts", ".tsx", ".mdx", ".md"]);
const BUILD_EXT = new Set([".html", ".js", ".json", ".txt", ".rsc"]);

/**
 * What is deliberately not scanned, and what covers it instead.
 *
 * `lib/` and `config/` hold the decision engine, which is allowed to
 * name its own channels: `export_eligible` is a column and
 * `recommended_channel` is the output of section 11's own rules. The
 * ban is on what a seller can read, not on what the business thinks.
 *
 * `components/admin/` is the dashboard — the one screen where a person
 * is *supposed* to see the channel, the max bid and the margin.
 *
 * `agent/` is covered better elsewhere: `INTERNAL_PATTERNS` in
 * agent/guards.ts blocks the same thing on Maya's actual output, which
 * is generated rather than written and so cannot be checked by reading
 * a file. agent/prompt.md necessarily quotes the ban in order to state
 * it, exactly as the comments in this file do.
 */
const SKIP = (file: string) =>
  file.startsWith(join("components", "admin")) ||
  file.startsWith(join("app", "admin"));

function walk(dir: string, keep: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "cache") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(full)) out.push(full);
  }
  return out;
}

function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function offenders(files: string[], stripComments = false): string[] {
  const hits: string[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (stripComments) text = withoutComments(text);
    for (const rule of BANNED) {
      const match = rule.exec(text);
      if (match) {
        const at = Math.max(0, match.index - 40);
        hits.push(
          `${file}: …${text.slice(at, match.index + 80).replace(/\s+/g, " ")}…`,
        );
        break;
      }
    }
  }
  return hits;
}

describe("which channel the car took", () => {
  it("is nowhere a seller can read it, in the source", () => {
    const files = SOURCE_DIRS.flatMap((d) =>
      walk(d, (f) => SOURCE_EXT.has(extname(f)) && !SKIP(f)),
    );
    expect(files.length, "no source files scanned — the paths are wrong").toBeGreaterThan(40);
    expect(offenders(files, true)).toEqual([]);
  });

  it("is nowhere in the built output", () => {
    if (!existsSync(".next")) {
      expect(existsSync(".next"), "run `npm run build` to check the output too").toBe(false);
      return;
    }
    // The build contains the admin dashboard too, which is allowed to
    // say all of this — it is the page where a person decides. Only
    // the public routes are scanned.
    const files = ["/server/app", "/static"]
      .flatMap((sub) => walk(`.next${sub}`, (f) => BUILD_EXT.has(extname(f))))
      .filter((f) => !f.includes("/admin") && !f.includes("/api"));
    expect(files.length, "no build files scanned").toBeGreaterThan(10);
    expect(offenders(files)).toEqual([]);
  });

  it("catches the sentence it was written for, and allows the page", () => {
    const caught = [
      "We will tell you honestly whether yours is an export car or a UK trade car, and price it accordingly.",
      "We'll tell you whether your car is one we export.",
      "Your car is an export car.",
      "Your car will be exported.",
      "export_eligible",
      "recommendedChannel",
    ];
    for (const sample of caught) {
      expect(
        BANNED.some((r) => r.test(sample)),
        `should be caught: ${sample}`,
      ).toBe(true);
    }

    // Everything /export actually says about the market stays legal.
    const allowed = [
      "We supply buyers in Cyprus.",
      "On those, export demand sits on top of the UK market.",
      "Once a car is past about five years the export route closes.",
      "These are the models the exporters we work with ask for.",
      "Why export demand changes what we can pay",
      "Why UK cars get exported, and what it means for your sale price",
    ];
    for (const sample of allowed) {
      expect(
        BANNED.some((r) => r.test(sample)),
        `should be allowed: ${sample}`,
      ).toBe(false);
    }
  });
});
