import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { getModel } from "@/config/models";

const model = getModel("sell-my-mercedes-gle");

export const size = ogSize;
export const contentType = ogContentType;
export const alt = model.h1;

export default function Image() {
  return ogImage({ title: model.h1, eyebrow: "We buy it, we collect it, we pay" });
}
