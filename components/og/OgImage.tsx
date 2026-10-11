import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import type { PhotoSlot } from "@/config/photography";
import { logoDataUri } from "@/lib/brand-logo";

/**
 * Shared Open Graph image renderer. Every route's opengraph-image.tsx
 * calls ogImage() with its own title so the card is unique per page.
 *
 * Ink ground, the wordmark in the corner, Newsreader for the title —
 * the same restraint as the site itself. The wordmark comes from
 * config/brand, so the designed logo lands on every social card at the
 * same moment it lands on the header.
 *
 * A page that has a banner photograph puts it on its card too, behind
 * the same left-to-right scrim the banner uses, so the card and the
 * page a reader lands on look like the same place.
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/**
 * A static instance of the display face. Deliberately not the variable
 * font from Google Fonts — Satori cannot parse it and the build fails.
 */
export async function displayFont(): Promise<ArrayBuffer | null> {
  try {
    const file = await readFile(
      join(process.cwd(), "assets", "Newsreader-Regular.woff"),
    );
    return Uint8Array.from(file).buffer;
  } catch {
    // Font missing — fall back to the default face rather than failing a build.
    return null;
  }
}

/**
 * A page's banner photograph, small enough to inline.
 *
 * Satori has no network and no image pipeline, so the file is read
 * from disk and resized here. 1200x630 at q70 is about 60KB, which
 * keeps the card inside the size every platform will fetch and the
 * render inside the time a build will wait.
 *
 * A failure is logged, not swallowed. The first version returned null
 * on any error and passed `slot.focal` — a CSS percentage pair — to
 * sharp's `position`, which only takes a keyword. Five of the seven
 * cards silently lost their photograph and the build said nothing.
 */
const GRAVITY = [
  ["northwest", "north", "northeast"],
  ["west", "centre", "east"],
  ["southwest", "south", "southeast"],
] as const;

/**
 * The slot's CSS object-position, as the nearest of sharp's nine crop
 * gravities. Coarse on purpose: a 1200x630 crop of a 3:2 photograph
 * moves very little, and a social card does not need the framing to
 * the pixel — it needs the subject in it.
 */
function gravityFor(focal: string | undefined): string {
  if (!focal) return "centre";
  const [x, y] = focal.split(/\s+/).map((part) => Number.parseFloat(part));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "centre";
  const band = (value: number) => (value < 34 ? 0 : value > 66 ? 2 : 1);
  return GRAVITY[band(y)][band(x)];
}

async function backgroundDataUri(slot: PhotoSlot): Promise<string | null> {
  if (!slot.src) return null;
  try {
    const sharp = createRequire(import.meta.url)("sharp");
    const file = await readFile(join(process.cwd(), "public", slot.src));
    const resized = await sharp(file)
      .resize(ogSize.width, ogSize.height, {
        fit: "cover",
        position: gravityFor(slot.focal),
      })
      .jpeg({ quality: 70 })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch (error) {
    console.error(`OG background failed for ${slot.src}:`, error);
    return null;
  }
}

export async function ogImage({
  title,
  eyebrow,
  image,
}: {
  title: string;
  eyebrow: string;
  image?: PhotoSlot;
}) {
  const [font, logo, background] = await Promise.all([
    displayFont(),
    logoDataUri(),
    image ? backgroundDataUri(image) : Promise.resolve(null),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#12140F",
          padding: "72px",
          fontFamily: font ? "Newsreader" : "sans-serif",
          position: "relative",
        }}
      >
        {background ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={background}
              alt=""
              width={ogSize.width}
              height={ogSize.height}
              style={{ position: "absolute", top: 0, left: 0 }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: ogSize.width,
                height: ogSize.height,
                backgroundImage:
                  "linear-gradient(to right, #12140F 0%, rgba(18,20,15,0.92) 45%, rgba(18,20,15,0.55) 100%)",
              }}
            />
          </>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6B6F6B",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 76,
              lineHeight: 1.05,
              color: "#F5F4F0",
              maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" height={40} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, color: "#F5F4F0" }}>{SITE.name}</div>
              <div
                style={{
                  marginTop: 8,
                  width: 212,
                  height: 1,
                  backgroundColor: "#4a4f48",
                }}
              />
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: font
        ? [{ name: "Newsreader", data: font, style: "normal", weight: 400 }]
        : undefined,
    },
  );
}
