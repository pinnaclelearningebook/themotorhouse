"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, LoaderCircle } from "lucide-react";
import { formatReg } from "@/lib/reg";
import { StatusBadge } from "@/components/admin/ui/Badge";
import type { SearchHit } from "@/lib/admin/search";

/**
 * Global search, and who is signed in.
 *
 * The operator is usually holding a phone with a missed call on it, or
 * a text with a registration in it. Four columns are searched —
 * registration, name, phone, email — and results land as they type.
 *
 * Debounced at 200ms and every in-flight request is aborted when the
 * next keystroke arrives, so results cannot arrive out of order and
 * overwrite a newer query with an older answer.
 *
 * `/` focuses it from anywhere, the way every tool the operator
 * already uses does, but not while they are typing in something else.
 */
export function TopBar({ email }: { email: string }) {
  const [term, setTerm] = useState("");
  /*
   * Results are stored with the query they answer, and the displayed
   * list is derived from that rather than cleared in an effect.
   *
   * Clearing state synchronously in an effect body is a second render
   * to undo the first, and the lint rule here rejects it. Keying the
   * results to their query also means a stale response can never be
   * shown beside a newer term, which the AbortController covers for
   * the network and this covers for everything else.
   */
  const [results, setResults] = useState<{ for: string; hits: SearchHit[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const query = term.trim();
  const hits = results?.for === query ? results.hits : null;

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch(
          `/admin/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setResults({ for: query, hits: data.hits ?? [] });
        setOpen(true);
      } catch {
        // Aborted by the next keystroke, or the network went. Either
        // way the next query will answer; showing an error for a
        // search nobody finished is noise.
      } finally {
        setBusy(false);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <Link href="/admin" className="shrink-0 font-display text-lg lg:hidden">
          TMH
        </Link>

        <div ref={wrapper} className="relative max-w-md flex-1">
          <label htmlFor="admin-search" className="sr-only">
            Search leads by registration, name, phone or email
          </label>
          <Search
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-structure"
          />
          <input
            id="admin-search"
            ref={input}
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => hits && setOpen(true)}
            placeholder="Search reg, name, phone, email"
            autoComplete="off"
            className="h-9 w-full rounded border border-line bg-paper pr-9 pl-9 text-sm placeholder:text-structure focus-visible:border-oxblood"
          />
          {busy && (
            <LoaderCircle
              aria-hidden="true"
              size={14}
              className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-structure motion-reduce:animate-none"
            />
          )}

          {open && hits !== null && (
            <div className="absolute inset-x-0 top-full mt-1 overflow-hidden rounded border border-line bg-paper shadow-[0_12px_32px_rgba(18,20,15,0.12)]">
              {hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-structure">
                  Nothing matching “{term.trim()}”.
                </p>
              ) : (
                <ul>
                  {hits.map((hit) => (
                    <li key={hit.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          router.push(`/admin/leads/${hit.id}` as never);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-paper-warm"
                      >
                        <span className="data-inline text-sm">
                          {formatReg(hit.reg)}
                        </span>
                        <span className="flex-1 truncate text-sm text-structure">
                          {hit.name ?? "No name yet"}
                          {hit.phone ? ` · ${hit.phone}` : ""}
                        </span>
                        <StatusBadge status={hit.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <span className="data-inline hidden truncate text-caption text-structure sm:block">
          {email}
        </span>
      </div>
    </header>
  );
}
