import type { Metadata } from "next";
import Link from "next/link";
import { funnelFrom, inboxRows, sweepPending } from "@/lib/admin/inbox";
import { METHOD_BADGE } from "@/lib/admin/contact";
import { titleCaseVehicle } from "@/lib/format";
import { formatReg } from "@/lib/reg";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TIMELINE_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  this_month: "This month",
  few_months: "Next few months",
  researching: "Just researching",
};

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function waiting(iso: string): string {
  const hours = hoursSince(iso);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ incomplete?: string }>;
}) {
  // Catch anything the inline trigger missed. Daily cron is the backstop;
  // this is the moment an unscored lead actually costs something.
  await sweepPending();
  const { rows: all, slaHours } = await inboxRows();
  const showIncomplete = (await searchParams).incomplete === "1";

  /*
   * Incomplete rows are hidden by default.
   *
   * Since 15 October 2026 a row is written the moment a car is
   * confirmed, before any contact details exist. Those rows are worth
   * keeping — they are the only record of where people give up — but
   * they are not work: there is nobody to ring. Left in the queue they
   * would be most of it, and the queue would stop meaning "people
   * waiting for a call".
   */
  const rows = showIncomplete ? all : all.filter((row) => !row.incomplete);
  const funnel = funnelFrom(all);
  const incompleteCount = all.length - funnel.completed;
  const newLeads = rows.filter((row) => row.status === "new");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-6">
        <h1 className="font-display text-display-3">Inbox</h1>
        <p className="data-inline text-caption text-structure">
          {newLeads.length} new · {rows.length} shown
        </p>
      </div>

      {/*
       * The funnel, from the rows themselves. Not a funnel from the
       * first keystroke: a row only exists once a car is confirmed, so
       * anyone who typed a registration and left before that is not
       * counted and cannot be. The label says so rather than letting
       * the first number read as "visitors".
       */}
      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-y border-line py-4">
        {[
          ["Confirmed a car", funnel.confirmedCar],
          ["Reached the sale", funnel.reachedSale],
          ["Reached contact", funnel.reachedContact],
          ["Completed", funnel.completed],
        ].map(([label, count]) => (
          <div key={label as string}>
            <dt className="text-caption text-structure">{label}</dt>
            <dd className="data-inline text-lg">{count}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-caption text-structure">
        Counted from step 1 onward. Someone who typed a registration and
        left before confirming the car leaves no record and is not here.
      </p>

      {incompleteCount > 0 && (
        <p className="mt-4 text-caption">
          <Link
            href={showIncomplete ? "/admin/inbox" : "/admin/inbox?incomplete=1"}
            className="link-draw text-oxblood"
          >
            {showIncomplete
              ? "Hide incomplete"
              : `Show ${incompleteCount} incomplete`}
          </Link>
          <span className="ml-2 text-structure">
            — no contact details, so nobody to ring.
          </span>
        </p>
      )}

      {slaHours === null && (
        <p className="mt-4 text-caption text-oxblood">
          No SLA is set, so nothing is marked overdue. Set one in Settings.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-structure">
          {all.length === 0
            ? "No leads yet. They appear here the moment a seller gives their contact details."
            : "Nothing to act on. Every lead so far stopped before giving contact details — use the link above to see them."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col">
          {rows.map((row) => {
            const breached =
              slaHours !== null &&
              row.status === "new" &&
              hoursSince(row.createdAt) > slaHours;
            const car = [
              row.make ? titleCaseVehicle(row.make) : null,
              row.model ? titleCaseVehicle(row.model) : null,
              row.year,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li key={row.id} className="border-t border-line last:border-b">
                <Link
                  href={`/admin/leads/${row.id}`}
                  className="flex flex-wrap items-baseline gap-x-6 gap-y-2 py-4 transition-colors duration-200 hover:bg-paper-warm"
                >
                  <span className="data-inline w-16 text-lg">
                    {row.score ?? "—"}
                  </span>

                  <span className="min-w-56 flex-1">
                    <span className="data-inline text-sm">
                      {formatReg(row.reg)}
                    </span>
                    {car && (
                      <span className="ml-3 text-sm text-structure">{car}</span>
                    )}
                    {!car && (
                      <span className="ml-3 text-sm text-structure">
                        No vehicle data
                      </span>
                    )}
                    <span className="mt-0.5 block text-caption text-structure">
                      {row.incomplete ? (
                        <span className="text-oxblood">Incomplete</span>
                      ) : (
                        <>
                          {row.name ?? "No name yet"}
                          {row.phone ? ` · ${row.phone}` : ""}
                          {row.preferredContactMethod && (
                            <span className="ml-2 rounded border border-line px-1.5 py-0.5">
                              {METHOD_BADGE[row.preferredContactMethod]}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </span>

                  <span className="w-40 text-caption text-structure">
                    {row.timeline
                      ? TIMELINE_LABELS[row.timeline]
                      : "Timeline not given"}
                  </span>

                  <span className="w-28 text-caption">
                    {row.recommendedChannel ? (
                      <span className="rounded border border-line px-2 py-0.5">
                        {row.recommendedChannel}
                      </span>
                    ) : (
                      <span className="text-structure">Not assessed</span>
                    )}
                  </span>

                  <span className="w-24 text-right">
                    <span
                      className={`data-inline text-caption ${
                        breached ? "font-medium text-oxblood" : "text-structure"
                      }`}
                    >
                      {waiting(row.createdAt)}
                    </span>
                    {breached && (
                      <span className="block text-caption text-oxblood">
                        over SLA
                      </span>
                    )}
                  </span>

                  <span className="w-20 text-right text-caption text-structure">
                    {row.pending
                      ? "scoring…"
                      : row.flagCount > 0
                        ? `${row.flagCount} flag${row.flagCount === 1 ? "" : "s"}`
                        : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
