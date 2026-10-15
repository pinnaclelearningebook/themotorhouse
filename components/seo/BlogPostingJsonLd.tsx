import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/config/site";
import { ORG_ID } from "@/components/seo/SiteJsonLd";
import type { Post } from "@/lib/blog";

/**
 * BlogPosting schema. Where a post has no photograph of its own — none do
 * yet — the generated OG image stands in, so `image` always points at a
 * real image rather than nothing.
 *
 * Author and publisher reference the AutoDealer node in the layout's
 * graph by `@id` rather than restating it. Describing the same
 * business twice on one page is how two slightly different versions
 * of it end up in the index.
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
        author: { "@id": absoluteUrl("/") + ORG_ID },
        publisher: { "@id": absoluteUrl("/") + ORG_ID },
        image: absoluteUrl(
          post.image ?? `/blog/${post.slug}/opengraph-image`,
        ),
        mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
        inLanguage: "en-GB",
        keywords: post.keywords.join(", "),
      }}
    />
  );
}
