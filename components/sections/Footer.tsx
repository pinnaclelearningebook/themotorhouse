import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { SITE, CONTACT, COMPANY, isAwaiting } from "@/config/site";
import { RECENTLY_PURCHASED } from "@/config/recently-purchased";

/**
 * The footer carries the full sitemap (CLAUDE.md 7a) — model pages join
 * at Milestone 3. The recently-purchased link appears only once real
 * cars exist, matching the page itself. Companies Act details render as
 * AwaitingInfo chips until the real values land in config/site.ts.
 */
const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/valuation", label: "Get my offer" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];
export function Footer() {
  return (
    <footer className="on-ink border-t border-line-dark bg-ink py-16 text-paper">
      <Container>
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div>
            <p className="font-display text-2xl">{SITE.name}</p>
            <p className="mt-2 max-w-xs text-sm text-paper/60">
              We buy premium cars across the UK for a firm offer that
              doesn&apos;t change.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="space-y-2 text-sm">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-draw">
                    {link.label}
                  </Link>
                </li>
              ))}
              {RECENTLY_PURCHASED.length > 0 && (
                <li>
                  <Link href="/recently-purchased" className="link-draw">
                    Recently purchased
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          <div className="text-sm text-paper/60">
            {isAwaiting(CONTACT.phone) ? (
              <AwaitingInfo label="Business phone number" />
            ) : (
              <p className="font-mono">{CONTACT.phone}</p>
            )}
            {isAwaiting(CONTACT.email) ? (
              <div className="mt-2">
                <AwaitingInfo label="Business email address" />
              </div>
            ) : (
              <p className="mt-2">{CONTACT.email}</p>
            )}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-line-dark pt-6 text-caption text-paper/50">
          <ul className="flex gap-6">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-draw">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {isAwaiting(COMPANY.registeredName) ? (
            <div className="flex flex-wrap gap-2">
              <AwaitingInfo label="Registered company name" />
              <AwaitingInfo label="Company registration number" />
              <AwaitingInfo label="Registered office address" />
            </div>
          ) : (
            <p>
              {COMPANY.registeredName} · Registered in England and Wales, company
              number <span className="font-mono">{COMPANY.companyNumber}</span> ·{" "}
              {COMPANY.registeredOffice}
            </p>
          )}
        </div>
      </Container>
    </footer>
  );
}
