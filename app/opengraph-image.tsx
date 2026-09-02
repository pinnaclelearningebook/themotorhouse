import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "A firm offer for your car that does not change";

export default function Image() {
  return ogImage({
    title: "Sell your car for a firm offer that doesn't change",
    eyebrow: "UK car buying service",
  });
}
