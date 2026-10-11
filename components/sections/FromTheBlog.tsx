import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GuideCard } from "@/components/blog/GuideCard";
import { Reveal } from "@/components/motion/Reveal";
import { getAllPosts } from "@/lib/blog";
import { TextLink } from "@/components/ui/TextLink";

/**
 * The three latest guides. Renders nothing while no posts exist, same
 * honesty rule as the recently-purchased section.
 */
export function FromTheBlog() {
  const posts = getAllPosts().slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <Section ground="paper" labelledBy="blog-heading">
      <SectionHeader
        eyebrow="Guides"
        id="blog-heading"
        heading="Worth reading first"
        intro="Written to be useful whether or not you sell us anything."
      />
      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Reveal as="li" key={post.slug} delay={index * 0.08}>
            <GuideCard post={post} />
          </Reveal>
        ))}
      </ul>
      <p className="mt-8">
        <TextLink href="/blog">All guides</TextLink>
      </p>
    </Section>
  );
}
