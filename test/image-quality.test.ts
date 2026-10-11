import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every `quality` we ask for has to be one Next will serve.
 *
 * `images.qualities` in next.config.ts is an allow-list, and a value
 * that is not on it does not error — Next falls back to 75 and says
 * nothing. The home hero spent a while being requested at 45 behind an
 * 85% scrim and arriving as a 98KB q=75 file for exactly this reason,
 * and the page heroes added on 11 October did it again at 62 and 58.
 *
 * It is a silent, repeatable mistake with a visible cost, which is the
 * definition of something that should be a test rather than a comment.
 */

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if ([".tsx", ".ts"].includes(extname(full))) found.push(full);
  }
  return found;
}

describe("image quality", () => {
  const config = readFileSync("next.config.ts", "utf8");
  const listed = (config.match(/qualities:\s*\[([^\]]+)\]/)?.[1] ?? "")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n));

  it("has an allow-list to check against", () => {
    expect(listed.length, "no qualities: [...] in next.config.ts").toBeGreaterThan(0);
  });

  it("asks only for qualities Next will actually serve", () => {
    const asked: string[] = [];
    for (const file of [...walk("app"), ...walk("components")]) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/quality=\{(\d+)\}/g)) {
        if (!listed.includes(Number(match[1])))
          asked.push(`${file}: quality={${match[1]}} falls back to 75`);
      }
    }
    expect(asked).toEqual([]);
  });

  it("fails on a quality that is not listed", () => {
    // The check is worth having only if an unlisted number trips it.
    const sample = 'quality={63}';
    const found = [...sample.matchAll(/quality=\{(\d+)\}/g)].map((m) => Number(m[1]));
    expect(found).toEqual([63]);
    expect(listed.includes(63), "63 must not be in the allow-list for this to mean anything").toBe(false);
  });
});
