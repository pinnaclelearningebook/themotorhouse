import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A phrase that must never appear anywhere we publish.
 *
 * "We Buy Any Car" is a competitor's registered trademark. It is not a
 * description of what we do, it is their name, and using it — in copy,
 * in a meta description, in alt text, in an OG image, in JSON-LD — is
 * both a legal problem and an admission that we are the cheap version
 * of someone else. It was in eleven places on 11 October 2026,
 * including the site's own meta description and its AutoDealer schema.
 *
 * Checked in the source every run, and in the build output too when a
 * build is present. The build is what actually reaches a reader, and it
 * contains things the source does not: generated metadata, inlined
 * strings, the flight data for every server component.
 */

const BANNED = /\bwe\s+buy\s+any\s+car\b/i;

const SOURCE_DIRS = ["app", "components", "config", "content", "agent", "lib"];
const SOURCE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mdx",
  ".md",
  ".json",
  ".css",
  ".svg",
  ".html",
  ".txt",
]);

/** Anything a reader could end up looking at. */
const BUILD_EXT = new Set([".html", ".js", ".json", ".txt", ".rsc", ".css"]);

function walk(dir: string, keep: (file: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "cache") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full, keep));
    else if (keep(full)) found.push(full);
  }
  return found;
}

/**
 * Comments are not published.
 *
 * The rule has to be writable down somewhere, and the places it most
 * needs writing down — the wordmark component, this file — are source
 * files. Stripping comments means a note explaining the ban does not
 * trip the ban, while a string literal, a prop or a line of JSX still
 * does. The build-output scan below is the backstop either way.
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

describe("a competitor's trademark", () => {
  it("is nowhere in the source", () => {
    const files = SOURCE_DIRS.flatMap((dir) =>
      walk(dir, (file) => SOURCE_EXT.has(extname(file))),
    );
    expect(files.length, "no source files scanned — the paths are wrong").toBeGreaterThan(50);
    expect(offenders(files, true)).toEqual([]);
  });

  it("is nowhere in the built output", () => {
    if (!existsSync(".next")) {
      // Nothing to check rather than a false pass: the source test above
      // has already run, and `npm run build` makes this one real.
      expect(existsSync(".next"), "run `npm run build` to check the output too").toBe(false);
      return;
    }
    const files = ["/server", "/static"].flatMap((sub) =>
      walk(`.next${sub}`, (file) => BUILD_EXT.has(extname(file))),
    );
    expect(files.length, "no build files scanned").toBeGreaterThan(10);
    expect(offenders(files)).toEqual([]);
  });

  it("fails when the phrase is there, in any case", () => {
    // The assertion is only worth having if it catches the thing.
    for (const sample of [
      "We Buy Any Car",
      "we buy any car, anywhere in mainland UK",
      "WE BUY ANY CAR",
      "We  buy\nany car",
    ]) {
      expect(BANNED.test(sample), sample).toBe(true);
    }
    for (const allowed of [
      "Any car, any age.",
      "We buy cars of any age.",
      "What we buy",
      "we buy every kind of car",
    ]) {
      expect(BANNED.test(allowed), allowed).toBe(false);
    }

    // A comment naming the ban is not a breach of it. The rule has to
    // be writable down somewhere, and the places it most needs writing
    // down are source files.
    const inAComment = '// never say "we buy any car" — it is theirs\nconst x = 1;';
    const inAString = 'const strapline = "We buy any car";';
    expect(BANNED.test(withoutComments(inAComment)), "comment").toBe(false);
    expect(BANNED.test(withoutComments(inAString)), "string literal").toBe(true);

    // And a comment naming the ban is not a breach of it, while the
    // same words in a string still are.
    expect(
      offenders(["components/ui/Wordmark.tsx"], true),
      "a comment explaining the rule must not trip it",
    ).toEqual([]);
    expect(
      offenders(["components/ui/Wordmark.tsx"]).length,
      "and the comment really is there, or this proves nothing",
    ).toBe(1);
  });
});
