import { Header } from "@/components/ui/Header";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Footer } from "@/components/sections/Footer";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { AnalyticsGate } from "@/components/consent/AnalyticsGate";

/**
 * The public site's chrome. /admin sits outside this group, so the
 * dashboard does not inherit a seller-facing header, footer or cookie
 * banner — none of which belong on an internal tool, and none of which
 * should drag the motion runtime into it either.
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
    <MotionProvider>
      <Header />
      {children}
      <Footer />
      <CookieConsent />
      <AnalyticsGate />
    </MotionProvider>
  );
}
