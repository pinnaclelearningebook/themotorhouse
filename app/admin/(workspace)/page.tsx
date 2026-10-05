import type { Metadata } from "next";
import Link from "next/link";
import { inboxRows, sweepPending } from "@/lib/admin/inbox";
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

export default async function InboxPage() {
  // Catch anything the inline trigger missed. Daily cron is the backstop;
  // this is the moment an unscored lead actually costs something.
  await sweepPending();
  const { rows, slaHours } = await inboxRows();

  const newLeads = rows.filter((row) => row.status === "new");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-6">
        <h1 className="font-display text-display-3">Inbox</h1>
        <p className="data-inline text-caption text-structure">
          {newLeads.length} new · {rows.length} total
        </p>
      </div>

      {slaHours === null && (
        <p className="mt-4 text-caption text-oxblood">
          No SLA is set, so nothing is marked overdue. Set one in Settings.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-structure">
          No leads yet. They appear here the moment a seller gives a phone
          number.
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
                      {row.name ?? "No name yet"}
                      {row.phone ? ` · ${row.phone}` : ""}
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
