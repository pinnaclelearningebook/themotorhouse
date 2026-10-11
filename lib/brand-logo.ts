import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOGO } from "@/config/brand";

/**
 * The logo as a data URI, for the places that cannot load a file: the
 * favicon, the app icon and the OG cards all render through Satori,
 * which takes images but not public paths.
 *
 * Server-only and in lib/ rather than config/, because config/brand is
 * imported by the header — a client component — and a `node:fs` import
 * reachable from the browser bundle fails the build outright. It did.
 *
 * Returns null when there is no file yet, and the caller draws type.
 */
export async function logoDataUri(): Promise<string | null> {
  if (!LOGO.file) return null;
  try {
    const bytes = await readFile(join(process.cwd(), "public", LOGO.file));
    const base64 = Buffer.from(bytes).toString("base64");
    const mime = LOGO.file.endsWith(".svg") ? "image/svg+xml" : "image/png";
    return `data:${mime};base64,${base64}`;
  } catch {
    // A configured file that is not there is worse than no file: it
    // would silently drop the brand off every social card.
    console.error(`[brand] LOGO.file is set to ${LOGO.file} but it is missing`);
    return null;
  }
}
