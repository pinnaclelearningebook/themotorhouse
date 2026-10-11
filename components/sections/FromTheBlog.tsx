import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { PostCard } from "@/components/blog/PostCard";
import { Reveal } from "@/components/motion/Reveal";
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
      <Reveal>
        <p className="text-caption font-medium tracking-[0.14em] text-structure uppercase">
          Guides
        </p>
        <h2 id="blog-heading" className="mt-4 font-display text-display-3">
          Worth reading first
        </h2>
        <p className="mt-5 max-w-prose text-lg">
          Written to be useful whether or not you sell us anything.
        </p>
      </Reveal>
      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Reveal as="li" key={post.slug} delay={index * 0.08}>
            <PostCard post={post} />
          </Reveal>
        ))}
      </ul>
      <p className="mt-12">
        <Link href="/blog" className="link-draw font-medium text-oxblood">
          All articles
        </Link>
      </p>
    </Section>
  );
}
