import type { MetadataRoute } from "next";
import { MODELS } from "@/config/models";
import { getAllPosts, getPostsByCategory, getUsedCategories } from "@/lib/blog";
import { RECENTLY_PURCHASED } from "@/config/recently-purchased";
import { absoluteUrl } from "@/config/site";

/**
 * Generated from real routes. Two deliberate omissions:
 * - /recently-purchased is excluded while the array is empty, because the
 *   page 404s in that state and a sitemap should never advertise a 404.
 * - /valuation/thank-you is noindex and has no business being crawled.
 *
 * **lastModified is the content's date, not the build's.** Every entry
 * used to carry `new Date()`, so a deploy that changed one footer link
 * told Google all thirty-four pages had just been rewritten. A
 * crawler that learns the dates are meaningless stops reading them,
 * and the one page that really did change loses the signal with the
 * rest. Guides carry their own updated or published date; everything
 * else carries the date its template last changed, which is a
 * constant maintained by hand below.
 */

/**
 * When the non-article pages were last meaningfully edited. Bump the
 * one you change; leaving it is more honest than touching them all.
 */
const PAGE_UPDATED: Record<string, string> = {
  "/": "2026-10-15",
  "/valuation": "2026-10-15",
  "/export": "2026-10-15",
  "/how-it-works": "2026-10-12",
  "/faq": "2026-10-12",
  "/about": "2026-10-12",
  "/blog": "2026-10-15",
  "/privacy": "2026-08-29",
  "/terms": "2026-08-29",
  "/cookies": "2026-08-29",
  "/recently-purchased": "2026-10-12",
};
const MODEL_UPDATED = "2026-10-15";
const CATEGORY_UPDATED = "2026-10-15";

export default function sitemap(): MetadataRoute.Sitemap {

  const core = [
    { path: "/", priority: 1 },
    { path: "/valuation", priority: 0.9 },
    { path: "/export", priority: 0.8 },
    { path: "/how-it-works", priority: 0.7 },
    { path: "/faq", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/blog", priority: 0.7 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/cookies", priority: 0.3 },
  ];

  const models = MODELS.map((model) => ({
    path: `/${model.slug}`,
    priority: 0.9,
    lastModified: MODEL_UPDATED,
  }));

  const posts = getAllPosts().map((post) => ({
    path: `/blog/${post.slug}`,
    priority: 0.7,
    lastModified: post.updatedAt ?? post.publishedAt,
  }));

  const categories = getUsedCategories().map((category) => ({
    path: `/blog/category/${category}`,
    priority: 0.4,
    // The index changes when a post in it changes.
    lastModified:
      getPostsByCategory(category)
        .map((post) => post.updatedAt ?? post.publishedAt)
        .sort()
        .at(-1) ?? CATEGORY_UPDATED,
  }));

  const conditional =
    RECENTLY_PURCHASED.length > 0
      ? [{ path: "/recently-purchased", priority: 0.5 }]
      : [];

  return [...core, ...models, ...posts, ...categories, ...conditional].map(
    (entry) => ({
      url: absoluteUrl(entry.path),
      lastModified:
        "lastModified" in entry
          ? new Date(entry.lastModified as string)
          : new Date(PAGE_UPDATED[entry.path] ?? MODEL_UPDATED),
      priority: entry.priority,
    }),
  );
}
