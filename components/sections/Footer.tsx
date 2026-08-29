import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { SITE, CONTACT, COMPANY, isAwaiting } from "@/config/site";

/**
 * Milestone 1 footer. Legal pages (privacy, terms, cookies) join the
 * nav in Milestone 2. Companies Act details render as AwaitingInfo
 * chips until the real values land in config/site.ts.
 */
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
              <li>
                <Link href="/" className="link-draw">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/valuation" className="link-draw">
                  Get my offer
                </Link>
              </li>
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
        <div className="mt-12 border-t border-line-dark pt-6 text-caption text-paper/50">
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
