import type { Metadata } from "next";
import Link from "next/link";
import { followUps, type FollowUpRow } from "@/lib/admin/followups";
import { titleCaseVehicle } from "@/lib/format";
import { setFollowUpDate } from "./actions";

export const metadata: Metadata = { title: "Follow-ups" };

/**
 * Who to ring, and when.
 *
 * The undated group is the point of the page: a "just researching" seller
 * with no date set is the lead most likely to be lost by accident, and it
 * is invisible on a board sorted by stage.
 */

function Row({ row, today }: { row: FollowUpRow; today: string }) {
  const vehicle = [row.make, row.model]
    .filter(Boolean)
    .map((part) => titleCaseVehicle(part as string))
    .join(" ");

  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-line py-3 last:border-b-0">
      <Link
        href={`/admin/leads/${row.id}`}
        className="link-draw data-inline font-mono text-sm font-medium"
      >
        {row.reg}
      </Link>
      <span className="text-sm text-structure">
        {vehicle || "vehicle not identified"}
      </span>
      <span className="text-sm">{row.name ?? "no name yet"}</span>
      {row.phone && (
        <a
          href={`tel:${row.phone.replace(/\s+/g, "")}`}
          className="link-draw data-inline font-mono text-sm"
        >
          {row.phone}
        </a>
      )}
      <span className="text-caption text-structure">{row.status}</span>
      {row.timeline && (
        <span className="text-caption text-structure">{row.timeline}</span>
      )}
      {row.nextContactDate && (
        <span className="data-inline font-mono text-caption">
          {row.nextContactDate}
        </span>
      )}

      <form action={setFollowUpDate} className="ml-auto flex items-center gap-2">
        <input type="hidden" name="leadId" value={row.id} />
        <label className="sr-only" htmlFor={`date-${row.id}`}>
          Next contact date for {row.reg}
        </label>
        <input
          id={`date-${row.id}`}
          type="date"
          name="nextContactDate"
          defaultValue={row.nextContactDate ?? ""}
          min={row.nextContactDate && row.nextContactDate < today ? undefined : today}
          className="data-inline rounded border border-line bg-paper px-2 py-1 font-mono text-caption"
        />
        <button
          type="submit"
          className="rounded border border-line px-2 py-1 text-caption hover:border-oxblood hover:text-oxblood"
        >
          Save
        </button>
      </form>
    </li>
  );
}

function Group({
  title,
  note,
  rows,
  today,
  tone,
}: {
  title: string;
  note?: string;
  rows: FollowUpRow[];
  today: string;
  tone?: "urgent";
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby={title}>
      <h2
        id={title}
        className={`flex items-baseline gap-3 font-display text-2xl ${
          tone === "urgent" ? "text-oxblood" : ""
        }`}
      >
        {title}
        <span className="data-inline font-mono text-caption text-structure">
          {rows.length}
        </span>
      </h2>
      {note && <p className="mt-1 text-sm text-structure">{note}</p>}
      <ul className="mt-3">
        {rows.map((row) => (
          <Row key={row.id} row={row} today={today} />
        ))}
      </ul>
    </section>
  );
}

export default async function FollowUpsPage() {
  const groups = await followUps();
  const total =
    groups.overdue.length +
    groups.today.length +
    groups.soon.length +
    groups.later.length +
    groups.undated.length;

  return (
    <div>
      <h1 className="font-display text-display-3">Follow-ups</h1>
      <p className="mt-3 max-w-2xl text-sm text-structure">
        Open leads by next contact date. Reminders are for you — nothing on
        this page sends a seller anything.
      </p>

      {total === 0 && (
        <p className="mt-10 text-sm text-structure">
          No open leads. New enquiries appear in the{" "}
          <Link href="/admin" className="link-draw text-oxblood">
            inbox
          </Link>
          .
        </p>
      )}

      <Group
        title="Overdue"
        rows={groups.overdue}
        today={groups.today_iso}
        tone="urgent"
      />
      <Group title="Today" rows={groups.today} today={groups.today_iso} />
      <Group title="Next seven days" rows={groups.soon} today={groups.today_iso} />
      <Group title="Later" rows={groups.later} today={groups.today_iso} />
      <Group
        title="No date set"
        note="Open leads nobody has scheduled. A seller who said they were just researching belongs here until a date is on them."
        rows={groups.undated}
        today={groups.today_iso}
      />
    </div>
  );
}
