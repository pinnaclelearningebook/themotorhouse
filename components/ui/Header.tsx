"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SITE } from "@/config/site";

/**
 * Header per CLAUDE.md section 7a: wordmark · nav · `Get my offer`, ink
 * on paper, 1px bottom hairline, no shadow or transparency. Below 768px
 * only the wordmark and CTA show — the nav lives in the footer, because
 * on a phone the header's one job is keeping the form a tap away.
 *
 * Static in flow at the top; once the user scrolls past the hero a fixed
 * copy slides in over 250ms. The fixed copy is inert and aria-hidden so
 * assistive tech and the tab order see one header, not two.
 */

// The desktop nav links until Milestone 3, when the commercial routes
// take these slots and these move to the footer.
const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

const STICKY_AFTER_PX = 560;

function HeaderBar() {
  return (
    <Container className="flex h-16 items-center justify-between gap-6">
      <Link href="/" className="font-display text-xl">
        {SITE.name}
      </Link>
      <div className="flex items-center gap-8">
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex gap-8 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-draw">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ButtonLink href="/valuation" size="compact">
          Get my offer
        </ButtonLink>
      </div>
    </Container>
  );
}

export function Header() {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    // Cheap boolean compare; React bails out of re-renders while the
    // value is unchanged, so no rAF throttling is needed.
    const onScroll = () => setPinned(window.scrollY > STICKY_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="border-b border-line bg-paper text-ink">
        <HeaderBar />
      </header>
      {pinned && (
        <div
          aria-hidden="true"
          inert
          className="header-drop fixed inset-x-0 top-0 z-40 border-b border-line bg-paper text-ink"
        >
          <HeaderBar />
        </div>
      )}
    </>
  );
}
