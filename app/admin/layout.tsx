import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { SITE } from "@/config/site";

/**
 * Every admin page is gated here and marked noindex. /admin is also
 * disallowed in robots.ts and excluded from the sitemap.
 *
 * The design system is the public site's — same tokens, same faces, no
 * plate yellow (CLAUDE.md section 5). Spacing is denser because this is
 * a working tool, not a page to be persuaded by.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

/**
 * Only routes that exist. Next's typed routes reject a link to a page
 * that is not built yet, which is a useful constraint: the nav cannot
 * promise a page that would 404. Entries are added as pages land.
 */
const NAV = [
  { href: "/admin", label: "Inbox" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-display text-lg">
              {SITE.name}
            </Link>
            <nav aria-label="Admin">
              <ul className="flex gap-6 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="link-draw">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <span className="data-inline text-caption text-structure">
            {admin.email}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
