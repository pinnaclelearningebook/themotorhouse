import { ImageResponse } from "next/og";
import { OgArch } from "@/components/og/OgArch";

/**
 * The home-screen icon. Oxblood ground, paper arch, no wordmark — at
 * 180px a name would be a smudge and the mark would not.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#5C1A1F",
        }}
      >
        <OgArch size={110} stroke="#F5F4F0" threshold="#F5F4F0" />
      </div>
    ),
    size,
  );
}
