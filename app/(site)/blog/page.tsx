import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/sections/CtaBand";
import { GuideCard } from "@/components/blog/GuideCard";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { PHOTOGRAPHY } from "@/config/photography";
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
            <PageHero
        eyebrow="Guides"
        heading="Advice for people selling a car"
        intro="Written to be useful whether or not you ever sell us anything, including the parts where another route beats us."
        image={PHOTOGRAPHY.guides.valuations}
        id="blog-heading"
        crumbs={[{ name: "Guides", path: "/blog" }]}
      />

      <Section ground="paper" labelledBy="guides-heading">
        <h2 id="guides-heading" className="sr-only">
          All guides
        </h2>

        {categories.length > 0 && (
          <nav aria-label="Categories">
            <ul className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    href={`/blog/category/${category}`}
                    className="inline-flex min-h-11 items-center rounded border border-line px-4 text-sm transition-colors duration-200 hover:border-oxblood hover:text-oxblood"
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
                <GuideCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-structure">
            The first articles are being written.
          </p>
        )}
      </Section>

      <CtaBand heading="Or skip the reading and get your number." />
    </main>
  );
}
