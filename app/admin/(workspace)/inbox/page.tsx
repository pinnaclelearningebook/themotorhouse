import type { Metadata } from "next";
import { Suspense } from "react";
import { sweepPending } from "@/lib/admin/inbox";
import {
  filtersFromParams,
  hasActiveFilters,
  inboxPage,
} from "@/lib/admin/inbox-query";
import { InboxTable } from "@/components/admin/InboxTable";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * The queue of people waiting for a call.
 *
 * The funnel used to live here and now lives on the dashboard, where
 * it belongs: this page is for working through leads, not for
 * reading about them in aggregate.
 *
 * Filters and sort come from the URL and go back to it, so a view is
 * a link. The table is a client component because selection and the
 * bulk bar are interactive; everything it needs is resolved here.
 */
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Catch anything the inline trigger missed. Daily cron is the backstop;
  // this is the moment an unscored lead actually costs something.
  await sweepPending();

  const filters = filtersFromParams(await searchParams);
  const page = await inboxPage(filters);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-baseline justify-between gap-6">
        <h1 className="font-display text-display-3">Inbox</h1>
        {page.slaHours === null && (
          <p className="text-caption text-oxblood">
            No SLA is set, so nothing is marked overdue. Set one in Settings.
          </p>
        )}
      </div>

      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-structure">Loading…</p>}>
          <InboxTable
            rows={page.rows}
            total={page.total}
            page={page.page}
            pages={page.pages}
            slaHours={page.slaHours}
            makes={page.makes}
            filtered={hasActiveFilters(filters)}
          />
        </Suspense>
      </div>
    </div>
  );
}
