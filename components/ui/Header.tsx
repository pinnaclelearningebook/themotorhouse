"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { MODELS } from "@/config/models";

/**
 * The header.
 *
 * Opaque at the top of the page and translucent with a backdrop blur
 * once you leave the hero, so the hero photograph reads full-bleed and
 * everything after it reads as paper. On a phone it gets out of the way
 * on the way down and comes straight back on the way up — the one place
 * a seller wants it is the moment they have decided.
 *
 * `Get my offer` is visible at every width and inside the open menu.
 * That is the header's job; the rest of the navigation is secondary to
 * it and always has been (CLAUDE.md section 7a).
 *
 * Scroll state is read in a passive listener and written to a ref before
 * it reaches React, so a scrolling page does not re-render on every
 * frame — only when a threshold is actually crossed.
 *
 * **No Motion in here.** The header is on every page and in the first
 * bundle, and the animation library behind it cost about 1.2s of LCP
 * on a throttled phone. The menus open with CSS transitions instead,
 * which look the same and weigh nothing. Motion is for below the fold,
 * where the cost is paid after the page is usable.
 */

const SOLID_AFTER_PX = 24;
const HIDE_AFTER_PX = 200;

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/export", label: "Why we pay more" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Guides" },
] as const;

export function Header() {
  /**
   * Only the home page has a dark hero for the header to sit over. On
   * every other page it is paper from the first pixel, so the
   * transparent state would be paper-coloured text on paper — invisible
   * navigation, which is how a header like this usually goes wrong.
   */
  const overHero = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > SOLID_AFTER_PX);
      // Only once past the hero, and never while the menu is open.
      setHidden(y > HIDE_AFTER_PX && y > lastY.current);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-[transform,background-color,border-color,backdrop-filter] duration-300 ease-(--ease-standard) motion-reduce:transition-none ${
          scrolled || !overHero
            ? "border-line bg-paper/85 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-paper"
            : "border-transparent bg-transparent"
        } ${hidden && !menu ? "-translate-y-full" : "translate-y-0"}`}
      >
        <Container>
          <div
            className={`flex h-16 items-center justify-between gap-6 ${
              scrolled || !overHero ? "text-ink" : "text-paper"
            }`}
          >
            <Link href="/" aria-label="The Motor House, home" className="shrink-0">
              <Wordmark className="hidden sm:block" />
              <Wordmark compact className="block sm:hidden" />
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
              <ModelsMenu />
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="link-draw text-sm">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <ButtonLink href="/valuation" size="tight">
                Get my offer
              </ButtonLink>
              <button
                type="button"
                onClick={() => setMenu(true)}
                aria-label="Open the menu"
                aria-expanded={menu}
                className="-mr-2 flex h-10 w-10 items-center justify-center lg:hidden"
              >
                <span aria-hidden="true" className="flex flex-col gap-[5px]">
                  <span className="block h-px w-6 bg-current" />
                  <span className="block h-px w-6 bg-current" />
                </span>
              </button>
            </div>
          </div>
        </Container>
      </header>

      {menu && <MobileMenu onClose={() => setMenu(false)} />}
    </>
  );
}

/* ─── the mega-menu ──────────────────────────────────────────────────── */

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
    <div
      ref={wrapper}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="link-draw text-sm"
      >
        What we buy
      </button>

      {open && (
        <div className="menu-drop absolute top-full left-1/2 z-50 mt-4 w-[46rem] -translate-x-1/2 rounded border border-line bg-paper p-2 text-ink shadow-[0_12px_40px_rgba(18,20,15,0.14)]">
          <p className="px-4 pt-3 pb-2 text-caption font-medium tracking-[0.14em] text-structure uppercase">
            Where we pay more
          </p>
          <ul className="grid grid-cols-2 gap-px bg-line">
            {MODELS.map((model) => (
              <li key={model.slug}>
                <Link
                  href={`/${model.slug}` as never}
                  onClick={() => setOpen(false)}
                  className="block bg-paper px-4 py-3 text-sm transition-colors duration-200 hover:bg-paper-warm"
                >
                  {model.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/valuation"
                onClick={() => setOpen(false)}
                className="block bg-paper px-4 py-3 text-sm font-medium text-oxblood transition-colors duration-200 hover:bg-paper-warm"
              >
                Any other car
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── the full-screen mobile menu ────────────────────────────────────── */

/**
 * A dialog, with everything that word implies: focus moves in, Tab is
 * trapped, Esc closes it, the page behind it does not scroll, and focus
 * returns to the button that opened it.
 */
function MobileMenu({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const pathname = usePathname();

  const close = useCallback(() => {
    onClose();
    (opener.current as HTMLElement | null)?.focus?.();
  }, [onClose]);

  useEffect(() => {
    opener.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-first]")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [close]);

  /**
   * A route change closes the menu — including a link to the page you
   * are already on, which `onClick` alone would miss.
   *
   * Skipping the first run matters: without it the effect fires on
   * mount and closes the menu in the same tick it opened, and the
   * button appears to do nothing at all.
   */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const items = [
    { href: "/valuation", label: "Get my offer", accent: true },
    ...LINKS,
  ];

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="on-ink fixed inset-0 z-50 flex flex-col bg-ink text-paper lg:hidden"
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Wordmark compact />
          <button
            type="button"
            data-first
            onClick={close}
            aria-label="Close the menu"
            className="flex h-10 w-10 items-center justify-center text-2xl leading-none"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </Container>

      <Container className="flex-1 overflow-y-auto pt-6 pb-14">
        <ul>
          {items.map((item, index) => (
            <li
              key={item.href}
              className="rise-in border-b border-line-dark"
              style={{ animationDelay: `${40 + index * 45}ms` }}
            >
              <Link
                href={item.href}
                onClick={close}
                className={`block py-5 font-display text-3xl ${
                  "accent" in item && item.accent ? "text-oxblood-lt" : ""
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-caption font-medium tracking-[0.14em] text-paper/45 uppercase">
          Where we pay more
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-x-6">
          {MODELS.map((model, index) => (
            <li
              key={model.slug}
              className="rise-in"
              style={{ animationDelay: `${300 + index * 30}ms` }}
            >
              <Link
                href={`/${model.slug}` as never}
                onClick={close}
                className="block border-b border-line-dark py-3 text-sm text-paper/75"
              >
                {model.name}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
