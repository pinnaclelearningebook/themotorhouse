import type { Metadata } from "next";
import { Newsreader, Inter_Tight, Geist_Mono } from "next/font/google";
import { SITE, siteUrl } from "@/config/site";
import "./globals.css";

/**
 * The display face is preloaded. The other two are not.
 *
 * Which font to preload is a question about what the largest element
 * on the page is, and the answer changed. While the hero was a
 * photograph, preloading 101KB of type put it in front of the 18KB
 * image the browser was actually waiting for, and LCP went to 3.2s.
 * The hero is now a headline and a drawing: the largest element is
 * the type itself, so the display face goes first and the body faces
 * wait, which is the same reasoning producing the opposite setting.
 *
 * `display: swap` and next/font's size-adjusted fallback mean every
 * word is readable from the first frame either way, and nothing moves
 * when the real face lands — CLS is 0.000 throughout.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/**
 * Weights are named rather than left to the variable default.
 *
 * Without them next/font ships the whole variable range, and the three
 * families together were 124KB queued ahead of the first paint. The
 * body face uses three weights and no more.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

/**
 * Not preloaded. Geist Mono is for registrations, mileages and dates —
 * none of which are in the first viewport of any page — so preloading
 * it only takes bandwidth from the display face, which *is* the
 * largest-contentful element and whose arrival is what LCP waits for.
 */
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE.name} — a firm offer for your car`,
    template: `%s — ${SITE.name}`,
  },
  description:
    "Any car, any age, anywhere in mainland UK. A firm offer within two hours, free collection, payment before the transporter leaves.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE.name,
    locale: "en_GB",
    type: "website",
  },
  /*
   * Search engine ownership verification, from the environment.
   *
   * Both are optional and both render nothing when unset, so the tag
   * never appears half-filled. A DNS TXT record is the better route
   * for Google — it verifies the whole domain including the apex and
   * any subdomain, and survives this file being rewritten — but the
   * meta tag is here for whichever one is easier to get added, and
   * for Bing, which has no domain-level option.
   *
   * Set with: vercel env add GOOGLE_SITE_VERIFICATION production
   */
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      /*
       * The inline script below adds `data-js` to this element before
       * React hydrates, so the DOM carries an attribute the server
       * HTML does not. React logs that as a hydration mismatch on
       * every page, which is a false alarm here and, worse, the noise
       * a real mismatch would hide behind. Suppression is scoped to
       * this element's own attributes, not the tree.
       */
      suppressHydrationWarning
      className={`${newsreader.variable} ${interTight.variable} ${geistMono.variable}`}
    >
      <body>
        {/*
         * Marks the document as scripted, before first paint.
         *
         * The scroll reveals hide their content until an observer says
         * otherwise, and that hidden state is scoped to [data-js]. With
         * scripting off or broken the attribute is never set, no
         * element is ever hidden, and the page reads normally — which
         * is the only acceptable failure mode for decoration.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: 'document.documentElement.setAttribute("data-js","")',
          }}
        />
        {children}
      </body>
    </html>
  );
}
