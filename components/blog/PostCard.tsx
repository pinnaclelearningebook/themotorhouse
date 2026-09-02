import Link from "next/link";
import { CATEGORY_LABELS, type Post } from "@/lib/blog";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block h-full rounded border border-line p-6 transition-colors duration-200 hover:border-oxblood"
    >
      <span className="text-caption tracking-wide text-structure uppercase">
        {CATEGORY_LABELS[post.category]}
      </span>
      <span className="mt-3 block font-display text-2xl">{post.title}</span>
      <span className="mt-3 block text-sm text-structure">
        {post.description}
      </span>
      <span className="mt-4 block font-mono text-caption text-structure">
        {post.readingMinutes} min read
      </span>
    </Link>
  );
}
