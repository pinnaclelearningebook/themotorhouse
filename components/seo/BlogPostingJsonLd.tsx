import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE } from "@/config/site";
import type { Post } from "@/lib/blog";

/**
 * BlogPosting schema. Where a post has no photograph of its own — none do
 * yet — the generated OG image stands in, so `image` always points at a
 * real image rather than nothing.
 */
export function BlogPostingJsonLd({ post }: { post: Post }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        author: { "@type": "Organization", name: post.author },
        publisher: { "@type": "Organization", name: SITE.name },
        image: absoluteUrl(
          post.image ?? `/blog/${post.slug}/opengraph-image`,
        ),
        mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
        keywords: post.keywords.join(", "),
      }}
    />
  );
}
