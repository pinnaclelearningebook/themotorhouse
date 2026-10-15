"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ChartNoAxesColumn,
  Inbox,
  Columns3,
  CalendarClock,
  Scale,
  MessageSquareWarning,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import type { SidebarCounts } from "@/lib/admin/counts";

/**
 * The workspace's spine.
 *
 * Collapsible, because a kanban board and a comparables table both
 * want the width back and neither wants to lose the badges. Collapsed
 * state lives in localStorage: it is a per-device preference, it is
 * worthless to anyone else, and it must survive a navigation without
 * a round trip.
 *
 * Hidden below `lg`, where the bottom tab bar takes over. Everything
 * is reachable at 375px by one or the other, never neither.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which count, if any, badges this entry. */
  badge?: keyof SidebarCounts;
}

export const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: ChartNoAxesColumn },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: "newLeads" },
  { href: "/admin/pipeline", label: "Pipeline", icon: Columns3 },
  {
    href: "/admin/follow-ups",
    label: "Follow-ups",
    icon: CalendarClock,
    badge: "overdueFollowUps",
  },
  { href: "/admin/comparables", label: "Comparables", icon: Scale },
  {
    href: "/admin/review",
    label: "Review",
    icon: MessageSquareWarning,
    badge: "agentFlags",
  },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const STORAGE = "tmh-admin-sidebar";
const CHANGED = "tmh-admin-sidebar-changed";

/**
 * Collapsed state, read from localStorage without an effect.
 *
 * The obvious version — `useState(false)` then read storage in a
 * `useEffect` — is a synchronous setState in an effect, which the
 * lint rule here rejects and React discourages: it is a second render
 * on every page load to apply a value that was available all along.
 *
 * `useSyncExternalStore` is the shape this actually is. The server
 * snapshot is `false`, so SSR and the first client render agree and
 * there is no hydration mismatch, and subscribing to `storage` means
 * collapsing the sidebar in one tab collapses it in the others.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE) === "1";
  } catch {
    // Private window, blocked storage: open is the right default.
    return false;
  }
}

function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const toggle = () => {
    try {
      localStorage.setItem(STORAGE, collapsed ? "0" : "1");
    } catch {
      // The preference simply does not persist. Not worth handling.
    }
    window.dispatchEvent(new Event(CHANGED));
  };
  return [collapsed, toggle];
}

/** Exact match for the dashboard, prefix for everything below it. */
export function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function Sidebar({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();
  const [collapsed, toggle] = useCollapsed();

  return (
    <nav
      aria-label="Workspace"
      data-collapsed={collapsed ? "" : undefined}
      className={`hidden shrink-0 border-r border-line bg-paper-warm lg:flex lg:flex-col ${
        collapsed ? "w-16" : "w-56"
      } transition-[width] duration-200 ease-(--ease-standard) motion-reduce:transition-none`}
    >
      <ul className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const current = isCurrent(pathname, item.href);
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href as never}
                aria-current={current ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded px-3 text-sm transition-colors duration-200 ${
                  current
                    ? "bg-ink text-paper"
                    : "text-ink/80 hover:bg-paper hover:text-ink"
                }`}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.75} className="shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {count > 0 && (
                  <span
                    className={`data-inline rounded-full px-1.5 py-0.5 text-caption leading-none ${
                      collapsed
                        ? "absolute top-1.5 right-1.5 bg-oxblood text-paper"
                        : current
                          ? "bg-paper/20 text-paper"
                          : "bg-oxblood text-paper"
                    }`}
                  >
                    {count}
                    <span className="sr-only"> needing attention</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="m-2 flex min-h-11 items-center gap-3 rounded px-3 text-caption text-structure transition-colors duration-200 hover:bg-paper hover:text-ink"
      >
        {collapsed ? (
          <PanelLeftOpen aria-hidden="true" size={18} strokeWidth={1.75} />
        ) : (
          <>
            <PanelLeftClose aria-hidden="true" size={18} strokeWidth={1.75} />
            <span>Collapse</span>
          </>
        )}
        <span className="sr-only">
          {collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
        </span>
      </button>
    </nav>
  );
}

/**
 * The phone's navigation. The first four entries only — a tab bar with
 * seven targets at 375px is a row of 46px buttons nobody can hit.
 * Comparables, Review and Settings are reached from the Dashboard.
 */
export function MobileTabs({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper lg:hidden"
    >
      <ul className="flex">
        {NAV.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const current = isCurrent(pathname, item.href);
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href as never}
                aria-current={current ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-caption ${
                  current ? "text-oxblood" : "text-structure"
                }`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
                <span>{item.label}</span>
                {count > 0 && (
                  <span className="data-inline absolute top-1.5 right-1/2 translate-x-4 rounded-full bg-oxblood px-1.5 text-caption leading-tight text-paper">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
