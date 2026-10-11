#!/usr/bin/env node
/**
 * Write app/favicon.ico from the same mark app/icon.tsx renders.
 *
 * Next generates /icon and /apple-icon and links both, which is what
 * a browser uses. It does not generate /favicon.ico, and plenty of
 * things still probe the root path for one — feed readers, link
 * unfurlers, older crawlers, and anyone running a site audit. On
 * 12 October 2026 that request 404'd.
 *
 * ICO is a container. Every size inside here is a PNG rather than a
 * BMP, which every browser since IE11 reads and which saves writing a
 * bitmap encoder for a file nobody looks at.
 *
 *   node scripts/favicon-ico.mjs            # from the local dev server
 *   node scripts/favicon-ico.mjs <base-url> # or any deployment
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("sharp");

const BASE = process.argv[2] ?? "http://localhost:3000";
const SIZES = [16, 32, 48];

const response = await fetch(`${BASE}/icon`);
if (!response.ok) {
  console.error(`GET ${BASE}/icon → ${response.status}. Is the server running?`);
  process.exit(1);
}
const source = Buffer.from(await response.arrayBuffer());

const images = await Promise.all(
  SIZES.map((size) => sharp(source).resize(size, size).png().toBuffer()),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16;
const entries = images.map((png, index) => {
  const size = SIZES[index];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += png.length;
  return entry;
});

writeFileSync("app/favicon.ico", Buffer.concat([header, ...entries, ...images]));
console.log(`app/favicon.ico: ${SIZES.join(", ")}px, ${offset} bytes`);
