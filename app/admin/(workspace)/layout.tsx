import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { SITE } from "@/config/site";

/**
 * The gated workspace. Every page inside this group requires a signed-in
 * admin; /admin/login and the auth callback sit outside it so they stay
 * reachable while signed out. noindex is set on the parent layout.
 *
 * The design system is the public site's — same tokens, same faces, no
 * plate yellow (CLAUDE.md section 5). Spacing is denser because this is
 * a working tool, not a page to be persuaded by.
 */

/**
 * Only routes that exist. Next's typed routes reject a link to a page
 * that is not built yet, which is a useful constraint: the nav cannot
 * promise a page that would 404. Entries are added as pages land.
 */
const NAV = [
  { href: "/admin", label: "Inbox" },
  { href: "/admin/pipeline", label: "Pipeline" },
  { href: "/admin/follow-ups", label: "Follow-ups" },
  { href: "/admin/comparables", label: "Comparables" },
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
