import type { Metadata } from "next";
import { Newsreader, Inter_Tight, Geist_Mono } from "next/font/google";
import { SITE, siteUrl } from "@/config/site";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
  display: "swap",
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
      <body>{children}</body>
    </html>
  );
}
