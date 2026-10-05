import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/sections/Footer";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { AnalyticsGate } from "@/components/consent/AnalyticsGate";

/**
 * The public site's chrome. /admin sits outside this group, so the
 * dashboard does not inherit a seller-facing header, footer or cookie
 * banner — none of which belong on an internal tool.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <CookieConsent />
      <AnalyticsGate />
    </>
  );
}
