import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Why we pay more for some cars";

export default function Image() {
  return ogImage({
    title: "Why we can pay more for some cars than a UK buyer can",
    eyebrow: "The reason, in full",
  });
}
