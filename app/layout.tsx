import type { Metadata } from "next";
import { Newsreader, Inter_Tight, Geist_Mono } from "next/font/google";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/sections/Footer";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { AnalyticsGate } from "@/components/consent/AnalyticsGate";
import { SITE, siteUrl } from "@/config/site";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE.name} — a firm offer for your car`,
    template: `%s — ${SITE.name}`,
  },
  description:
    "We buy premium cars across the UK. A firm offer within two hours, free collection anywhere in mainland UK, payment before the transporter leaves.",
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
        <Header />
        {children}
        <Footer />
        <CookieConsent />
        <AnalyticsGate />
      </body>
    </html>
  );
}
