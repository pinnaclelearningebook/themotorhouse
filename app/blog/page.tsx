import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { PostCard } from "@/components/blog/PostCard";
import { PlateForm } from "@/components/ui/PlateForm";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { CATEGORY_LABELS, getAllPosts, getUsedCategories } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Advice for people selling a car",
  description:
    "Straight guidance on valuations, outstanding finance, write-off categories and what actually adds value — useful whether or not you sell to us.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getUsedCategories();

  return (
    <main>
      <BreadcrumbJsonLd trail={[{ name: "Blog", path: "/blog" }]} />
      <Section ground="paper" labelledBy="blog-heading">
        <div className="max-w-3xl">
          <h1 id="blog-heading" className="font-display text-display-2">
            Advice for people selling a car
          </h1>
          <p className="mt-4 text-lg text-structure">
            Written to be useful whether or not you ever sell us anything.
          </p>
        </div>

        {categories.length > 0 && (
          <nav aria-label="Categories" className="mt-10">
            <ul className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    href={`/blog/category/${category}`}
                    className="inline-block rounded border border-line px-4 py-2 text-sm transition-colors duration-200 hover:border-oxblood"
                  >
                    {CATEGORY_LABELS[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {posts.length > 0 ? (
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-structure">
            The first articles are being written.
          </p>
        )}
      </Section>

      <Section ground="ink" labelledBy="blog-cta-heading">
        <div className="max-w-3xl">
          <h2 id="blog-cta-heading" className="font-display text-display-3">
            Or skip the reading and get your number.
          </h2>
          <div className="mt-8">
            <PlateForm id="blog-reg" />
          </div>
        </div>
      </Section>
    </main>
  );
}
