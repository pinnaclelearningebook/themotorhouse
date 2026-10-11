#!/usr/bin/env node
/**
 * Regenerate config/blur.ts from everything in public/photography.
 *
 * Twelve pixels wide is enough to carry a scene's colour and shape and
 * small enough to inline in the HTML without costing a request. Run it
 * after adding or replacing a photograph:
 *
 *   node scripts/blur-placeholders.mjs
 *
 * Uses macOS `sips`, which is already how the images were resized, so
 * there is no image library in the dependency tree for a build step
 * that runs by hand a few times a year.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

const SOURCE = "public/photography";
const OUT = "config/blur.ts";

const temp = mkdtempSync(join(tmpdir(), "blur-"));
const entries = {};

for (const file of readdirSync(SOURCE).sort()) {
  if (![".jpg", ".jpeg", ".png"].includes(extname(file))) continue;
  const name = basename(file, extname(file));
  const tiny = join(temp, `${name}.jpg`);
  execFileSync("sips", [
    "-Z", "12",
    "-s", "format", "jpeg",
    "-s", "formatOptions", "40",
    join(SOURCE, file),
    "--out", tiny,
  ], { stdio: "ignore" });
  entries[name] = `data:image/jpeg;base64,${readFileSync(tiny).toString("base64")}`;
}

rmSync(temp, { recursive: true, force: true });

const header = `/**
 * Tiny inline previews, generated from the images themselves.
 *
 * Twelve pixels wide, which is enough to carry the colour and the
 * shape of a scene and small enough to sit in the HTML without
 * costing a request. next/image renders one blurred behind every
 * photograph until the real file lands, so a slow connection gets the
 * tone of the page immediately instead of a hole in it.
 *
 * Regenerate with scripts/blur-placeholders.mjs after adding an image.
 */
export const BLUR: Record<string, string> = {
`;

const body = Object.entries(entries)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");

writeFileSync(OUT, `${header}${body}\n};\n`);
console.log(`${OUT}: ${Object.keys(entries).length} placeholders`);
