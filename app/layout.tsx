import type { Metadata } from "next";
import { Newsreader, Inter_Tight, Geist_Mono } from "next/font/google";
import { SITE, siteUrl } from "@/config/site";
import "./globals.css";

/**
 * No font is preloaded, and that is a measurement rather than a
 * preference.
 *
 * Preloading the two text faces puts 101KB at the front of the queue,
 * where it competes with the thing the browser is actually waiting
 * for: on the home page the largest-contentful element is the hero
 * photograph, 18KB, and with the fonts preloaded it landed at 3.2s
 * against a 1.0s first paint.
 *
 * Nothing is lost by waiting. `display: swap` paints every word
 * immediately in a fallback, and next/font's size-adjusted fallback
 * metrics mean the swap moves nothing — which is why CLS is 0.000
 * throughout. The text is readable from the first frame either way;
 * the only difference is which file gets the bandwidth first.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
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
