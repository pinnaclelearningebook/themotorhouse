import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { PHOTOGRAPHY } from "@/config/photography";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Get a firm offer for your car";

export default function Image() {
  return ogImage({
    title: "Get my offer",
    eyebrow: "Your car",
    image: PHOTOGRAPHY.homeHero,
  });
}
