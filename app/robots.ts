import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/valuation/thank-you", "/admin", "/api", "/form-preview"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
