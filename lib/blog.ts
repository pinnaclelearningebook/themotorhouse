import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MODELS } from "@/config/models";

/**
 * Blog posts live in content/blog/*.mdx with frontmatter. No CMS: posts are
 * git-versioned and can be written directly in the repo.
 *
 * Everything here runs at build time only.
 */

export const CATEGORIES = [
  "valuations",
  "selling-guides",
  "model-guides",
  "market-insight",
  "ownership",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  valuations: "Valuations",
  "selling-guides": "Selling guides",
  "model-guides": "Model guides",
  "market-insight": "Market insight",
  ownership: "Ownership",
};

export interface PostFrontmatter {
  title: string;
  slug: string;
  description: string;
  category: Category;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  /** Optional: no photography exists yet, so the generated OG image stands in. */
  image?: string;
  keywords: string[];
  relatedModels: string[];
}

export interface Post extends PostFrontmatter {
  content: string;
  readingMinutes: number;
}

const BLOG_DIR = join(process.cwd(), "content", "blog");

function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function parsePost(filename: string): Post {
  const raw = readFileSync(join(BLOG_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const fm = data as PostFrontmatter;

  const expectedSlug = filename.replace(/\.mdx$/, "");
  if (fm.slug !== expectedSlug) {
    throw new Error(
      `Blog post ${filename}: slug "${fm.slug}" does not match its filename.`,
    );
  }
  if (!CATEGORIES.includes(fm.category)) {
    throw new Error(
      `Blog post ${filename}: unknown category "${fm.category}".`,
    );
  }
  for (const slug of fm.relatedModels) {
    if (!MODELS.some((model) => model.slug === slug)) {
      throw new Error(
        `Blog post ${filename}: relatedModels references unknown model "${slug}".`,
      );
    }
  }

  return { ...fm, content, readingMinutes: readingMinutes(content) };
}

export function getAllPosts(): Post[] {
  let files: string[];
  try {
    files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }
  const posts = files.map(parsePost);
  assertInternalLinksResolve(posts);
  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPost(slug: string): Post | null {
  return getAllPosts().find((post) => post.slug === slug) ?? null;
}

export function getPostsByCategory(category: Category): Post[] {
  return getAllPosts().filter((post) => post.category === category);
}

export function getUsedCategories(): Category[] {
  const used = new Set(getAllPosts().map((post) => post.category));
  return CATEGORIES.filter((category) => used.has(category));
}

/**
 * Build-time link checker. A post that links to a route or post that does
 * not exist fails the build rather than shipping a broken link. With twelve
 * cross-linked posts this is the thing most likely to go wrong.
 */
const STATIC_ROUTES = new Set([
  "/",
  "/about",
  "/blog",
  "/cookies",
  "/export",
  "/faq",
  "/how-it-works",
  "/privacy",
  "/recently-purchased",
  "/terms",
  "/valuation",
]);

function assertInternalLinksResolve(posts: Post[]): void {
  const postSlugs = new Set(posts.map((post) => post.slug));
  const modelSlugs = new Set(MODELS.map((model) => model.slug));

  for (const post of posts) {
    const links = [...post.content.matchAll(/\]\((\/[^)\s]*)\)/g)].map(
      (match) => match[1],
    );
    for (const link of links) {
      const path = link.split("#")[0].replace(/\/$/, "") || "/";
      if (STATIC_ROUTES.has(path)) continue;
      if (modelSlugs.has(path.slice(1))) continue;
      if (path.startsWith("/blog/category/")) {
        const category = path.replace("/blog/category/", "");
        if (CATEGORIES.includes(category as Category)) continue;
      }
      if (path.startsWith("/blog/") && postSlugs.has(path.slice(6))) continue;
      throw new Error(
        `Blog post "${post.slug}" links to "${link}", which does not resolve to any route or post.`,
      );
    }
  }
}
