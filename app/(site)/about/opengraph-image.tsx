import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { PHOTOGRAPHY } from "@/config/photography";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "What The Motor House is, and why it exists";

export default function Image() {
  return ogImage({
    title: "The Motor House buys cars. That is the whole business.",
    eyebrow: "About us",
    image: PHOTOGRAPHY.aboutRoad,
  });
}
