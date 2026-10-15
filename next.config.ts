import type { NextConfig } from "next";

/**
 * Everything the site was reachable at before the domain existed.
 *
 * themotorhouse.vercel.app is still live and still serving the same
 * pages, which is two hosts with identical content — the oldest way
 * to split a site's authority in half. Anything that arrives there
 * goes to the same path on the real domain, permanently, so links and
 * any indexing that happened in the meantime consolidate rather than
 * compete.
 *
 * Host-matched rather than blanket, so preview deployments (which
 * have their own hostnames and must not redirect into production)
 * are untouched.
 */
const OLD_HOSTS = [
  "themotorhouse.vercel.app",
  "themotorhouse-pinnaclelearningebook-7934s-projects.vercel.app",
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://www.selltothemotorhouse.co.uk/:path*",
      permanent: true,
    }));
  },
  images: {
    /**
     * AVIF first. The hero is the largest-contentful element on the
     * site and AVIF is roughly a third smaller than WebP at the same
     * perceptual quality, which on a throttled phone is the difference
     * between hitting the LCP budget in CLAUDE.md section 14 and not.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * Next refuses any `quality` not listed here and silently falls
     * back to 75 — which is how a hero asked to render at 45 behind an
     * 85% scrim kept arriving as a 98KB q=75 file.
     */
    qualities: [40, 45, 60, 72, 75],
    /**
     * Trimmed. The defaults go up to 3840, and a phone at DPR 3 will
     * happily ask for a 1920-wide copy of an image it is showing at
     * 412 CSS pixels through a scrim.
     */
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
  },
};

export default nextConfig;
