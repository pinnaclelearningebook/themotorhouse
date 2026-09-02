"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MODELS } from "@/config/models";
import { SITE } from "@/config/site";

/**
 * Header per CLAUDE.md section 7a: wordmark · nav · `Get my offer`, ink on
 * paper, 1px bottom hairline, no shadow or transparency. Below 768px only
 * the wordmark and CTA show — the nav lives in the footer, because on a
 * phone the header's one job is keeping the form a tap away.
 *
 * At Milestone 3 the nav carries the commercial routes: the seven model
 * pages behind a "Cars we buy" disclosure, plus /export. How it works,
 * About and FAQ moved to footer-only, since navigation should serve the
 * seller's decision rather than our sitemap.
 *
 * Static in flow at the top; once the user scrolls past the hero a fixed
 * copy slides in over 250ms. The fixed copy is inert and aria-hidden so
 * assistive tech and the tab order see one header, not two.
 */

const STICKY_AFTER_PX = 560;

function ModelsMenu() {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setOpen(false);
      }
    }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="link-draw text-sm"
      >
        Cars we buy
      </button>
      {open && (
        <ul className="absolute top-full left-0 z-50 mt-3 w-60 rounded border border-line bg-paper py-2">
          {MODELS.map((model) => (
            <li key={model.slug}>
              <Link
                href={`/${model.slug}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm transition-colors duration-200 hover:bg-paper-warm"
              >
                {model.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HeaderBar({ interactive }: { interactive: boolean }) {
  return (
    <Container className="flex h-16 items-center justify-between gap-6">
      <Link href="/" className="font-display text-xl">
        {SITE.name}
      </Link>
      <div className="flex items-center gap-8">
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {interactive ? (
            <ModelsMenu />
          ) : (
            <span className="text-sm">Cars we buy</span>
          )}
          <Link href="/export" className="link-draw text-sm">
            Why we pay more
          </Link>
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
    const onScroll = () => setPinned(window.scrollY > STICKY_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="border-b border-line bg-paper text-ink">
        <HeaderBar interactive />
      </header>
      {pinned && (
        <div
          aria-hidden="true"
          inert
          className="header-drop fixed inset-x-0 top-0 z-40 border-b border-line bg-paper text-ink"
        >
          <HeaderBar interactive={false} />
        </div>
      )}
    </>
  );
}
