import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROMISES } from "@/config/site";

/**
 * What we promise, and the one place it is written down.
 *
 * On 11 October 2026 the home page's assurance strip said "Same-day
 * payment" while every other surface said payment happens before the
 * transporter leaves. Those are not the same promise: one is a
 * deadline nobody agreed to, the other is a sequence we control. The
 * stricter-sounding one was the one on the home page, typed straight
 * into a component as a literal, where nothing could see it drift.
 *
 * So the promises live in config/site and the surfaces read them.
 */

const BANNED = /same[-\s]?day\s+payment|paid\s+same[-\s]?day/i;

const SOURCE_DIRS = ["app", "components", "config", "content", "agent", "lib"];
const SOURCE_EXT = new Set([".ts", ".tsx", ".mdx", ".md", ".json", ".html"]);
const BUILD_EXT = new Set([".html", ".js", ".json", ".txt", ".rsc"]);

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

/**
 * Comments are not published, and the rule has to be writable down in
 * the component it governs. Same reasoning as test/trademark.test.ts.
 */
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
    const match = BANNED.exec(text);
    if (match) {
      const at = Math.max(0, match.index - 40);
      hits.push(`${file}: …${text.slice(at, match.index + 60).replace(/\s+/g, " ")}…`);
    }
  }
  return hits;
}

describe("a payment promise nobody made", () => {
  it("is nowhere in the source", () => {
    const files = SOURCE_DIRS.flatMap((d) =>
      walk(d, (f) => SOURCE_EXT.has(extname(f))),
    );
    expect(files.length).toBeGreaterThan(50);
    expect(offenders(files, true)).toEqual([]);
  });

  it("is nowhere in the built output", () => {
    if (!existsSync(".next")) {
      expect(existsSync(".next"), "run `npm run build` to check the output too").toBe(false);
      return;
    }
    const files = ["/server", "/static"].flatMap((sub) =>
      walk(`.next${sub}`, (f) => BUILD_EXT.has(extname(f))),
    );
    expect(files.length).toBeGreaterThan(10);
    expect(offenders(files)).toEqual([]);
  });

  it("catches the phrasings it is meant to", () => {
    for (const bad of [
      "Same-day payment",
      "same day payment",
      "SAME-DAY PAYMENT",
      "You are paid same day.",
    ]) {
      expect(BANNED.test(bad), bad).toBe(true);
    }
    for (const fine of [
      "Payment before the transporter leaves",
      "Do it the same day.",
      "You'll hear back same-day.",
    ]) {
      expect(BANNED.test(fine), fine).toBe(false);
    }
  });
});

describe("the assurance strip", () => {
  const strip = readFileSync("components/sections/AssuranceStrip.tsx", "utf8");
  const code = withoutComments(strip);

  it("reads every promise from config rather than retyping it", () => {
    expect(strip).toMatch(/PROMISES\.collection/);
    expect(strip).toMatch(/PROMISES\.payment/);
    expect(strip).toMatch(/PROMISES\.offerWithinHours/);
  });

  it("states no promise the config does not", () => {
    // Anything in quotes in this file that reads like a claim is a
    // claim nobody else can see. The only literals allowed are the
    // words around the constants.
    expect(code).not.toMatch(/Same-day/i);
    expect(code).not.toMatch(/Free UK collection/);
    // And the comment that explains the rule really is still there, or
    // the assertion above is passing on an empty file.
    expect(strip).toMatch(/Same-day/);
  });

  it("is the published wording, to the word", () => {
    expect(PROMISES.collection).toBe("Free collection anywhere in mainland UK");
    expect(PROMISES.payment).toBe("Payment before the transporter leaves");
    expect(PROMISES.offerWithinHours).toBe(2);
  });
});
