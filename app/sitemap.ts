import type { MetadataRoute } from "next";
import { MODELS } from "@/config/models";
import { RECENTLY_PURCHASED } from "@/config/recently-purchased";
import { absoluteUrl } from "@/config/site";

/**
 * Generated from real routes. Two deliberate omissions:
 * - /recently-purchased is excluded while the array is empty, because the
 *   page 404s in that state and a sitemap should never advertise a 404.
 * - /valuation/thank-you is noindex and has no business being crawled.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const core = [
    { path: "/", priority: 1 },
    { path: "/valuation", priority: 0.9 },
    { path: "/export", priority: 0.8 },
    { path: "/how-it-works", priority: 0.7 },
    { path: "/faq", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/cookies", priority: 0.3 },
  ];

  const models = MODELS.map((model) => ({
    path: `/${model.slug}`,
    priority: 0.9,
  }));

  const conditional =
    RECENTLY_PURCHASED.length > 0
      ? [{ path: "/recently-purchased", priority: 0.5 }]
      : [];

  return [...core, ...models, ...conditional].map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified,
    priority: entry.priority,
  }));
}
