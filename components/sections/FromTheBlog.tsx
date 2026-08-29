import Link from "next/link";
import { Section } from "@/components/ui/Section";

/**
 * Latest three posts. The blog arrives in Milestone 4 — until the MDX
 * infrastructure exists this array stays empty and the section renders
 * nothing, same rule as RecentlyPurchased.
 */
interface PostPreview {
  slug: string;
  title: string;
  description: string;
}

const latestPosts: PostPreview[] = [];

export function FromTheBlog() {
  if (latestPosts.length === 0) {
    return null;
  }

  return (
    <Section ground="paper" labelledBy="blog-heading">
      <h2 id="blog-heading" className="font-display text-display-3">
        From the blog
      </h2>
      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {latestPosts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block h-full rounded border border-line p-6 transition-colors duration-200 hover:border-oxblood"
            >
              <h3 className="font-display text-2xl">{post.title}</h3>
              <p className="mt-3 text-sm text-structure">{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
