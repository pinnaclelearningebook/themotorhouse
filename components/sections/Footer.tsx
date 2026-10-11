import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";
import { CONTACT, COMPANY, isAwaiting } from "@/config/site";
import { RECENTLY_PURCHASED } from "@/config/recently-purchased";
import { MODELS } from "@/config/models";

/**
 * The footer carries the full sitemap (CLAUDE.md 7a): content pages,
 * every model page, legal links and company details. How it works,
 * About and FAQ live here rather than the header from Milestone 3, since
 * the header carries the commercial routes. The recently-purchased link
 * appears only once real cars exist, matching the page itself.
 */
const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/export", label: "Why we pay more" },
  { href: "/blog", label: "Advice" },
  { href: "/valuation", label: "Get my offer" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];
/**
 * A column heading. The footer used to be four blocks of different
 * shapes in a flex row, which read as leftovers; four labelled columns
 * on a grid read as a sitemap, which is what section 7a asks for.
 */
function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-caption font-semibold tracking-[0.16em] text-paper/50 uppercase">
      {children}
    </p>
  );
}

/**
 * Footer links get a 44px row on a phone and tighten from md.
 * A 13px link with 8px between it and the next one is a tap target
 * that misses, and the footer is where someone goes when they are
 * already slightly lost.
 */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href as never}
        className="flex min-h-11 items-center text-sm text-paper/80 transition-colors duration-200 hover:text-paper md:min-h-0 md:py-1"
      >
        <span className="link-draw">{children}</span>
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="on-ink border-t border-line-dark bg-ink py-16 text-paper md:py-20">
      <Container>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/60">
              Any car, any age, anywhere in mainland UK, for a firm offer
              that doesn&apos;t change.
            </p>
          </div>

          <nav aria-label="Footer">
            <FooterHeading>The site</FooterHeading>
            <ul className="mt-4">
              {siteLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
              {RECENTLY_PURCHASED.length > 0 && (
                <FooterLink href="/recently-purchased">
                  Recently purchased
                </FooterLink>
              )}
            </ul>
          </nav>

          <nav aria-label="What we buy">
            <FooterHeading>What we buy</FooterHeading>
            <ul className="mt-4">
              <FooterLink href="/valuation">Any car, any age</FooterLink>
              {MODELS.map((model) => (
                <FooterLink key={model.slug} href={`/${model.slug}`}>
                  {model.name}
                </FooterLink>
              ))}
            </ul>
          </nav>

          <div>
            <FooterHeading>Contact</FooterHeading>
            <div className="mt-4 text-sm text-paper/70">
              {isAwaiting(CONTACT.phone) ? (
                <AwaitingInfo label="Business phone number" />
              ) : (
                <p className="font-mono">{CONTACT.phone}</p>
              )}
              {isAwaiting(CONTACT.email) ? (
                <div className="mt-3">
                  <AwaitingInfo label="Business email address" />
                </div>
              ) : (
                <p className="mt-3">{CONTACT.email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-line-dark pt-7 text-caption text-paper/50">
          <ul className="flex flex-wrap gap-x-7">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center transition-colors duration-200 hover:text-paper/80 md:min-h-0"
                >
                  <span className="link-draw">{link.label}</span>
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
