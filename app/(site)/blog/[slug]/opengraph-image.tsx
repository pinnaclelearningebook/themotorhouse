import { ogImage, ogSize, ogContentType } from "@/components/og/OgImage";
import { CATEGORY_LABELS, getAllPosts, getPost } from "@/lib/blog";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "The Motor House";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  return ogImage({
    title: post?.title ?? "The Motor House",
    eyebrow: post ? CATEGORY_LABELS[post.category] : "Advice",
  });
}
