"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ArrowRight } from "lucide-react";
import { MODELS } from "@/config/models";

/**
 * The header.
 *
 * Paper throughout, picking up a hairline and a backdrop blur once you
 * scroll. It used to go transparent over the home hero, which worked
 * while that hero was a dark photograph and broke the moment it became
 * light: paper-coloured text on paper, so the navigation vanished and
 * only the button was left. One state is also one fewer thing to get
 * wrong on a page nobody thought to check.
 *
 * On a phone it gets out of the way on the way down and comes straight
 * back on the way up — the one place a seller wants it is the moment
 * they have decided.
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
          scrolled
            ? "border-line bg-paper/90 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-paper"
            : "border-transparent bg-paper"
        } ${hidden && !menu ? "-translate-y-full" : "translate-y-0"}`}
      >
        <Container>
          <div
            className="flex h-16 items-center justify-between gap-6 text-ink"
          >
            <Link href="/" aria-label="The Motor House, home" className="shrink-0">
              <Logo className="hidden sm:block" />
              <Logo compact className="block sm:hidden" />
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

/**
 * "What we buy", as a panel the width of the header.
 *
 * It used to be `absolute left-1/2 -translate-x-1/2 w-[46rem]`, anchored
 * to the trigger. The trigger sits near the left of a wide header, so a
 * 736px panel centred on it hung off the left edge of the viewport and
 * clipped four of the seven models. Anchoring to the trigger is the
 * mistake: the panel belongs to the header, which is already the full
 * width of the window, so it is positioned against that and its
 * contents sit in the same Container as everything else. There is no
 * width at which it can leave the viewport.
 *
 * Keyboard: the trigger is a button, so Enter and Space come free. Down
 * and Up move through the links, Home and End jump, Escape closes and
 * puts focus back on the trigger. It also closes on an outside click
 * and on a route change.
 *
 * The descriptors are the first sentence of each model page's own
 * published meta description. Nothing new is written here — a menu is
 * exactly the kind of surface where a fresh claim appears without
 * anyone reviewing it.
 */
function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}

function ModelsMenu() {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback(
    (returnFocus = false) => {
      setOpen(false);
      if (returnFocus) trigger.current?.focus();
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close(true);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const links = Array.from(
        panel.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
      );
      if (links.length === 0) return;
      event.preventDefault();
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? links.length - 1
            : event.key === "ArrowDown"
              ? at + 1
              : at - 1;
      links[(next + links.length) % links.length].focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // A route change closes it, including a link to the page you are on.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={wrapper}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className="link-draw text-sm"
      >
        What we buy
      </button>

      {open && (
        <div
          ref={panel}
          data-mega-menu
          className="menu-drop absolute inset-x-0 top-full z-50 border-y border-line bg-paper text-ink shadow-[0_18px_40px_rgba(18,20,15,0.10)]"
        >
          <Container>
            <div className="grid gap-x-10 gap-y-1 py-7 md:grid-cols-2">
              {MODELS.map((model) => (
                <Link
                  key={model.slug}
                  href={`/${model.slug}` as never}
                  onClick={() => close()}
                  className="group rounded px-3 py-3 transition-colors duration-200 hover:bg-paper-warm focus-visible:bg-paper-warm"
                >
                  <span className="block font-display text-lg">
                    {model.name}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink/70">
                    {firstSentence(model.metaDescription)}
                  </span>
                </Link>
              ))}
              <Link
                href="/valuation"
                onClick={() => close()}
                className="group mt-2 flex items-center justify-between gap-4 rounded bg-oxblood px-5 py-4 text-paper transition-colors duration-200 hover:bg-oxblood-lt md:col-span-2"
              >
                <span>
                  <span className="block font-display text-lg">
                    Any other car
                  </span>
                  <span className="mt-1 block text-sm text-paper/80">
                    Most of what we buy is not on this list. Same offer, same
                    collection, same payment.
                  </span>
                </span>
                <ArrowRight aria-hidden="true" size={18} className="shrink-0" />
              </Link>
            </div>
          </Container>
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
          <Logo compact />
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
