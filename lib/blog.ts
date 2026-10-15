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

/**
 * What each category page is for, in its own words.
 *
 * The generated "Articles on x from The Motor House." was 43-48
 * characters of the same sentence five times — technically unique,
 * substantively one description repeated, which is what a thin
 * category page looks like to a crawler and to a reader.
 */
export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  valuations:
    "What actually moves the number on a used car, how buyers arrive at a figure, and how to judge whether an offer is a fair one.",
  "selling-guides":
    "Step-by-step guides to selling a car in the UK: the paperwork, outstanding finance, write-off categories, and the routes worth comparing.",
  "model-guides":
    "Model-by-model guides from the selling side — what affects resale value on a Range Rover, Defender, Evoque, Velar, Discovery Sport, Lexus or GLE.",
  "market-insight":
    "Why used car values move: export demand, theft and insurance, supply, and what each of them means for what you are offered.",
  ownership:
    "Running and preparing a car for sale — what spending comes back when you sell it, what does not, and what to have ready.",
};

export interface PostFrontmatter {
  title: string;
  slug: string;
  description: string;
  /**
   * The <title>, when the headline is too long for one.
   *
   * A headline is editorial and a title tag is a 60-character budget;
   * forcing one to be the other costs you a sentence somebody wrote
   * on purpose. Absent, the title is used — see the post page, which
   * also drops the brand suffix on guides so the whole 60 goes on the
   * question the reader actually typed.
   */
  seoTitle?: string;
  /** The meta description, when `description` is too long for one. */
  seoDescription?: string;
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

/**
 * The guides that name this model, newest first.
 *
 * The relationship is already in the content — every post lists the
 * models it is about — so the model pages read it backwards rather
 * than keeping a second list that can disagree with the first. It is
 * also the fix for model pages having nothing to link to but their
 * three siblings and the form.
 */
export function getPostsForModel(slug: string, limit = 3): Post[] {
  return getAllPosts()
    .filter((post) => post.relatedModels.includes(slug))
    .slice(0, limit);
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
