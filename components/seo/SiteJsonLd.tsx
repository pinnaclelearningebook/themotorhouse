import { JsonLd } from "@/components/seo/JsonLd";
import { SITE, CONTACT, COMPANY, absoluteUrl, isAwaiting } from "@/config/site";

/**
 * The business and the site, once, as a linked graph.
 *
 * Emitted from the public layout rather than per page. Two entities,
 * each with an `@id` so everything else can point at them instead of
 * describing the business again: a BlogPosting's publisher, a
 * BreadcrumbList's site, a future Product's seller. Repeating the
 * organisation on every page is how the same business ends up
 * described three slightly different ways.
 *
 * **AutoDealer, not Organization.** It is the specific type, and the
 * more specific type is always the better claim. It is also an
 * Organization subtype, so anything expecting one still resolves.
 *
 * **Only fields we actually have.** No address, no telephone, no
 * sameAs, and above all no aggregateRating — there are no reviews, and
 * a rating asserted without them is both a fabricated business fact
 * (CLAUDE.md section 3) and a manual action waiting to happen. Each
 * joins as the real value lands in config/site.ts.
 */
export const ORG_ID = "#organization";
export const SITE_ID = "#website";

export function SiteJsonLd() {
  const organisation: Record<string, unknown> = {
    "@type": "AutoDealer",
    "@id": absoluteUrl("/") + ORG_ID,
    name: SITE.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon"),
    image: absoluteUrl("/opengraph-image"),
    description:
      "A UK car buying service. Any car, any age, anywhere in mainland UK. Firm offers, free collection, payment before the transporter leaves.",
    areaServed: { "@type": "Country", name: "United Kingdom" },
    knowsLanguage: "en-GB",
  };
  if (!isAwaiting(CONTACT.phone)) organisation.telephone = CONTACT.phone;
  if (!isAwaiting(CONTACT.email)) organisation.email = CONTACT.email;
  if (!isAwaiting(COMPANY.registeredOffice)) {
    organisation.address = COMPANY.registeredOffice;
  }
  if (!isAwaiting(COMPANY.companyNumber)) {
    organisation.identifier = {
      "@type": "PropertyValue",
      name: "Companies House company number",
      value: COMPANY.companyNumber,
    };
  }

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          organisation,
          {
            "@type": "WebSite",
            "@id": absoluteUrl("/") + SITE_ID,
            url: absoluteUrl("/"),
            name: SITE.name,
            inLanguage: "en-GB",
            publisher: { "@id": absoluteUrl("/") + ORG_ID },
            /*
             * No `potentialAction`/SearchAction. There is no site
             * search, and describing one that does not exist is a
             * claim about the page that the page does not support —
             * which is exactly what Google's structured data policy
             * calls mismatched content. It goes in when search does.
             */
          },
        ],
      }}
    />
  );
}
