import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { PHOTOGRAPHY } from "@/config/photography";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Four steps, and no surprises at any of them";

export default function Image() {
  return ogImage({
    title: "Four steps, and no surprises at any of them.",
    eyebrow: "How it works",
    image: PHOTOGRAPHY.handover,
  });
}
