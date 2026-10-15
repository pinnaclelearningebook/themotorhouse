import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/sections/CtaBand";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MdxContent } from "@/components/blog/MdxContent";
import { GuideCard } from "@/components/blog/GuideCard";
import { BlogPostingJsonLd } from "@/components/seo/BlogPostingJsonLd";
import { getModel } from "@/config/models";
import { PHOTOGRAPHY } from "@/config/photography";
import { CATEGORY_LABELS, getAllPosts, getPost } from "@/lib/blog";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    /*
     * `absolute`, so the "— The Motor House" suffix is dropped here.
     * On a guide the brand is the least valuable eighteen characters
     * on the page: nobody searches for us by name yet, and the words
     * they do search for are the ones the suffix pushes out of the
     * 60-character budget. The short pages keep it.
     */
    title: { absolute: post.seoTitle ?? post.title },
    description: post.seoDescription ?? post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Same category first, then anything else, so "more reading" reads as
  // a continuation rather than whatever happened to be published last.
  const others = getAllPosts().filter((other) => other.slug !== post.slug);
  const related = [
    ...others.filter((other) => other.category === post.category),
    ...others.filter((other) => other.category !== post.category),
  ].slice(0, 3);
  const models = post.relatedModels.map(getModel);

  return (
    <main>
      <BlogPostingJsonLd post={post} />

      <article>
        <PageHero
          id="post-heading"
          eyebrow={
            <Link
              href={`/blog/category/${post.category}`}
              className="link-draw text-paper/70"
            >
              {CATEGORY_LABELS[post.category]}
            </Link>
          }
          heading={post.title}
          intro={post.description}
          image={PHOTOGRAPHY.guides[post.category]}
          crumbs={[
            { name: "Guides", path: "/blog" },
            {
              name: CATEGORY_LABELS[post.category],
              path: `/blog/category/${post.category}`,
            },
            { name: post.title, path: `/blog/${post.slug}` },
          ]}
        >
          <p className="mt-7 font-mono text-caption text-paper/65">
            <time dateTime={post.publishedAt}>{post.publishedAt}</time> ·{" "}
            {post.readingMinutes} min read
            {post.updatedAt && post.updatedAt !== post.publishedAt && (
              <> · updated {post.updatedAt}</>
            )}
          </p>
        </PageHero>

        <Container>
          <div className="max-w-2xl py-16 md:py-24">
            <MdxContent source={post.content} />
          </div>
        </Container>
      </article>

      {models.length > 0 && (
        <Section ground="paper-warm" labelledBy="post-models-heading">
          <SectionHeader
            id="post-models-heading"
            eyebrow="Related"
            heading="Selling one of these?"
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {models.map((model) => (
              <Card as="li" key={model.slug} tone="paper" hover className="p-0">
                <Link
                  href={`/${model.slug}`}
                  className="flex h-full flex-col justify-between gap-6 p-6"
                >
                  <span className="font-display text-2xl">{model.name}</span>
                  <span className="flex items-center gap-2 text-sm font-medium text-oxblood">
                    Get my offer
                    <ArrowRight aria-hidden="true" size={16} />
                  </span>
                </Link>
              </Card>
            ))}
          </ul>
        </Section>
      )}

      {related.length > 0 && (
        <Section ground="paper" labelledBy="post-related-heading">
          <SectionHeader
            id="post-related-heading"
            eyebrow="Keep reading"
            heading="More on selling a car"
          />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {related.map((other) => (
              <li key={other.slug}>
                <GuideCard post={other} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <CtaBand
        id="post-cta-heading"
        heading="When you are ready, we will give you a number."
      />

    </main>
  );
}
