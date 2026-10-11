import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import { OgArch } from "@/components/og/OgArch";

/**
 * Shared Open Graph image renderer. Every route's opengraph-image.tsx
 * calls ogImage() with its own title so the card is unique per page.
 *
 * Ink ground, the arch and the ruled wordmark in the corner, Newsreader
 * for the title — the same restraint as the site itself. No
 * photography, since none of ours exists yet.
 */
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/**
 * A static instance of the display face. Deliberately not the variable
 * font from Google Fonts — Satori cannot parse it and the build fails.
 */
async function displayFont(): Promise<ArrayBuffer | null> {
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

export async function ogImage({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  const font = await displayFont();

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
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
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
        <div style={{ display: "flex", alignItems: "center" }}>
          <OgArch size={46} />
          <div
            style={{
              marginLeft: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 30, color: "#F5F4F0" }}>{SITE.name}</div>
            <div
              style={{
                marginTop: 8,
                width: 200,
                height: 1,
                backgroundColor: "#2C302A",
              }}
            />
          </div>
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
