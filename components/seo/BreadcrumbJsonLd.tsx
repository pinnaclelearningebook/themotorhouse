import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/config/site";

/**
 * BreadcrumbList for pages below the home page. Positions are 1-indexed
 * and home is always first.
 */
export function BreadcrumbJsonLd({
  trail,
}: {
  trail: Array<{ name: string; path: string }>;
}) {
  const items = [{ name: "Home", path: "/" }, ...trail];
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}
