import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { PlateForm } from "@/components/ui/PlateForm";
import { MdxContent } from "@/components/blog/MdxContent";
import { PostCard } from "@/components/blog/PostCard";
import { BlogPostingJsonLd } from "@/components/seo/BlogPostingJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getModel } from "@/config/models";
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
    title: post.title,
    description: post.description,
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

  const related = getAllPosts()
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3);
  const models = post.relatedModels.map(getModel);

  return (
    <main>
      <BlogPostingJsonLd post={post} />
      <BreadcrumbJsonLd
        trail={[
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />

      <article>
        <Section ground="paper" labelledBy="post-heading">
          <div className="max-w-2xl">
            <Link
              href={`/blog/category/${post.category}`}
              className="link-draw text-caption tracking-wide text-structure uppercase"
            >
              {CATEGORY_LABELS[post.category]}
            </Link>
            <h1
              id="post-heading"
              className="mt-4 font-display text-display-3 md:text-display-2"
            >
              {post.title}
            </h1>
            <p className="mt-5 text-lg text-structure">{post.description}</p>
            <p className="mt-6 font-mono text-caption text-structure">
              <time dateTime={post.publishedAt}>{post.publishedAt}</time> ·{" "}
              {post.readingMinutes} min read
              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <> · updated {post.updatedAt}</>
              )}
            </p>
          </div>
        </Section>

        <Container>
          <div className="max-w-2xl pb-24">
            <MdxContent source={post.content} />
          </div>
        </Container>
      </article>

      {models.length > 0 && (
        <Section ground="paper-warm" labelledBy="post-models-heading">
          <h2
            id="post-models-heading"
            className="font-display text-display-3"
          >
            Selling one of these?
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {models.map((model) => (
              <li key={model.slug}>
                <Link
                  href={`/${model.slug}`}
                  className="block h-full rounded border border-line bg-paper p-6 transition-colors duration-200 hover:border-oxblood"
                >
                  <span className="font-display text-2xl">{model.name}</span>
                  <span className="mt-3 block text-sm font-medium text-oxblood">
                    Get my offer
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {related.length > 0 && (
        <Section ground="paper" labelledBy="post-related-heading">
          <h2
            id="post-related-heading"
            className="font-display text-display-3"
          >
            More reading
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {related.map((other) => (
              <li key={other.slug}>
                <PostCard post={other} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section ground="ink" labelledBy="post-cta-heading">
        <div className="max-w-3xl">
          <h2 id="post-cta-heading" className="font-display text-display-3">
            When you are ready, we will give you a number.
          </h2>
          <p className="mt-4 text-paper/80">
            A firm offer within two hours, and no obligation to take it.
          </p>
          <div className="mt-8">
            <PlateForm id="post-reg" />
          </div>
        </div>
      </Section>
    </main>
  );
}
