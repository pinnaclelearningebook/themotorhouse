import { JsonLd } from "@/components/seo/JsonLd";
import { SITE, CONTACT, COMPANY, isAwaiting } from "@/config/site";

/**
 * AutoDealer schema for the home and about pages. Emits only fields we
 * actually have — address, phone, and sameAs join as the real values
 * land in config/site.ts (see PENDING-INFO.md).
 */
export function AutoDealerJsonLd() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: SITE.name,
    description:
      "A UK car buying service. Firm offers on premium cars, free collection anywhere in mainland UK, payment before the transporter leaves.",
  };
  if (!isAwaiting(CONTACT.phone)) data.telephone = CONTACT.phone;
  if (!isAwaiting(CONTACT.email)) data.email = CONTACT.email;
  if (!isAwaiting(COMPANY.registeredOffice)) {
    data.address = COMPANY.registeredOffice;
  }
  return <JsonLd data={data} />;
}
