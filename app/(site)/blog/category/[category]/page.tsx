import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { PostCard } from "@/components/blog/PostCard";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  getPostsByCategory,
  getUsedCategories,
  type Category,
} from "@/lib/blog";

export function generateStaticParams() {
  return getUsedCategories().map((category) => ({ category }));
}

export const dynamicParams = false;

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return {};
  return {
    title: CATEGORY_LABELS[category],
    description: `Articles on ${CATEGORY_LABELS[category].toLowerCase()} from The Motor House.`,
    alternates: { canonical: `/blog/category/${category}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const posts = getPostsByCategory(category);
  if (posts.length === 0) notFound();

  return (
    <main>
      <BreadcrumbJsonLd
        trail={[
          { name: "Blog", path: "/blog" },
          {
            name: CATEGORY_LABELS[category],
            path: `/blog/category/${category}`,
          },
        ]}
      />
      <Section ground="paper" labelledBy="category-heading">
        <h1 id="category-heading" className="font-display text-display-2">
          {CATEGORY_LABELS[category]}
        </h1>
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
