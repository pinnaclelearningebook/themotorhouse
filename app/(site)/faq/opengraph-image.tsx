import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { PHOTOGRAPHY } from "@/config/photography";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Straight answers about selling your car to us";

export default function Image() {
  return ogImage({
    title: "Straight answers, including the awkward ones.",
    eyebrow: "Questions",
    image: PHOTOGRAPHY.faqInterior,
  });
}
