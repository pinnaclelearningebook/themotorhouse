import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/blog";

/**
 * The three latest posts. Renders nothing while no posts exist, same
 * honesty rule as the recently-purchased section.
 */
export function FromTheBlog() {
  const posts = getAllPosts().slice(0, 3);
  if (posts.length === 0) {
    return null;
  }

  return (
    <Section ground="paper" labelledBy="blog-heading">
      <h2 id="blog-heading" className="font-display text-display-3">
        From the blog
      </h2>
      <p className="mt-4 max-w-prose text-structure">
        Written to be useful whether or not you sell us anything.
      </p>
      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
      <p className="mt-10">
        <Link href="/blog" className="link-draw font-medium text-oxblood">
          All articles
        </Link>
      </p>
    </Section>
  );
}
