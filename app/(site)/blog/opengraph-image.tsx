import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { PHOTOGRAPHY } from "@/config/photography";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Advice for people selling a car";

export default function Image() {
  return ogImage({
    title: "Advice for people selling a car",
    eyebrow: "Guides",
    image: PHOTOGRAPHY.guides.valuations,
  });
}
