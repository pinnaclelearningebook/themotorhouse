import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin/auth";
import { sidebarCounts } from "@/lib/admin/counts";
import { Sidebar, MobileTabs } from "@/components/admin/Sidebar";
import { TopBar } from "@/components/admin/TopBar";
import { ToastProvider } from "@/components/admin/ui/Toast";

/**
 * The gated workspace. Every page inside this group requires a signed-in
 * admin; /admin/login and the auth callback sit outside it so they stay
 * reachable while signed out. noindex is set on the parent layout.
 *
 * The design system is the public site's — same tokens, same faces, no
 * plate yellow (CLAUDE.md section 5). Spacing is denser because this is
 * a working tool, not a page to be persuaded by.
 *
 * Sidebar from `lg`, bottom tabs below it. Not both, and never
 * neither: at 375px the four tabs carry the sections an operator uses
 * standing up, and the rest are reached from the dashboard.
 *
 * The badge counts are fetched once here rather than per page, so a
 * navigation does not re-count, and they are three `head: true`
 * queries rather than three row fetches — the sidebar renders on every
 * page and must not pull four hundred rows to show a "3".
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  const counts = await sidebarCounts();

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-paper">
        <Sidebar counts={counts} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar email={admin.email} />
          {/*
            * The bottom padding clears the mobile tab bar, which is
            * fixed. Without it the last row of every table sits
            * underneath it and cannot be tapped.
            */}
          <main className="w-full flex-1 px-4 pt-6 pb-24 lg:px-6 lg:pb-10">
            {children}
          </main>
        </div>
        <MobileTabs counts={counts} />
      </div>
    </ToastProvider>
  );
}
