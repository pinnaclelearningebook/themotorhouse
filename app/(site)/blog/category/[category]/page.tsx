import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { PHOTOGRAPHY } from "@/config/photography";
import { CtaBand } from "@/components/sections/CtaBand";
import { GuideCard } from "@/components/blog/GuideCard";
import { PageHero } from "@/components/ui/PageHero";
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
      <PageHero
        eyebrow="Guides"
        heading={CATEGORY_LABELS[category]}
        intro={`${posts.length} ${posts.length === 1 ? "guide" : "guides"} in this category. Every one of them is written to be useful whether or not you ever sell us anything.`}
        image={PHOTOGRAPHY.guides[category]}
        id="category-heading"
      />

      <Section ground="paper" labelledBy="category-list-heading">
        <h2 id="category-list-heading" className="sr-only">
          {CATEGORY_LABELS[category]} guides
        </h2>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <GuideCard post={post} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand heading="Ready for your number?" />
    </main>
  );
}
