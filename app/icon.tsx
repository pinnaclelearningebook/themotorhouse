import { ImageResponse } from "next/og";
import { OgArch } from "@/components/og/OgArch";

/**
 * The favicon, generated from the mark rather than shipped as a file.
 *
 * Replaces the 26KB .ico that was here: it was a quarter of the page's
 * image budget for a 16px square, and it was not the mark.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
        <OgArch size={40} stroke="#F5F4F0" threshold="#F5F4F0" />
      </div>
    ),
    size,
  );
}
