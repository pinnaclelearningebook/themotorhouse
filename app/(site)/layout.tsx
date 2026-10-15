import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/sections/Footer";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { AnalyticsGate } from "@/components/consent/AnalyticsGate";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";

/**
 * The public site's chrome. /admin sits outside this group, so the
 * dashboard does not inherit a seller-facing header, footer or cookie
 * banner — none of which belong on an internal tool.
 *
 * The header is fixed, so every page under it begins at the top of the
 * viewport. The home hero accounts for that with its own top padding;
 * anything else gets the offset from the shared page padding.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteJsonLd />
      <Header />
      {children}
      <Footer />
      <CookieConsent />
      <AnalyticsGate />
    </>
  );
}
