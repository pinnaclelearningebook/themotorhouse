import { ImageResponse } from "next/og";
import { displayFont } from "@/components/og/OgImage";
import { logoDataUri } from "@/lib/brand-logo";

/** The home-screen icon. Same rule as the favicon, at 180px. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
          <img src={logo} alt="" width={132} height={132} />
        ) : (
          <div style={{ fontSize: 96, color: "#5C1A1F", letterSpacing: "-0.02em" }}>
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
