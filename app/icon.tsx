import { ImageResponse } from "next/og";
import { displayFont } from "@/components/og/OgImage";
import { logoDataUri } from "@/lib/brand-logo";

/**
 * The favicon.
 *
 * The designed logo when there is one; until then the initials in the
 * display face, oxblood on paper. Neutral on purpose — a favicon that
 * commits to a mark we have not chosen yet is a thing to undo later.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const [logo, font] = await Promise.all([logoDataUri(), displayFont()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F4F0",
          fontFamily: font ? "Newsreader" : "serif",
        }}
      >
        {logo ? (
          <img src={logo} alt="" width={48} height={48} />
        ) : (
          <div style={{ fontSize: 34, color: "#5C1A1F", letterSpacing: "-0.02em" }}>
            MH
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Newsreader", data: font, style: "normal", weight: 400 }]
        : undefined,
    },
  );
}
