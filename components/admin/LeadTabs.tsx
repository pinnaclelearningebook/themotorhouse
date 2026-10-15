import Link from "next/link";

/**
 * The lead's tabs, as links rather than client state.
 *
 * A tab in the URL means the server renders only the panel being
 * looked at — the MOT timeline, the photo gallery and the activity
 * log are three separate queries and there is no reason to run all of
 * them to show one. It also makes a tab something you can send to the
 * other operator, and the back button behaves.
 *
 * Marked up as a tab list for assistive technology, but the controls
 * are links because that is what they are. `aria-current` rather than
 * `aria-selected`, for the same reason.
 */
export const LEAD_TABS = [
  { key: "overview", label: "Overview" },
  { key: "vehicle", label: "Vehicle" },
  { key: "offers", label: "Offers" },
  { key: "activity", label: "Notes & activity" },
  { key: "contact", label: "Contact" },
] as const;

export type LeadTab = (typeof LEAD_TABS)[number]["key"];

export function isLeadTab(value: string | undefined): value is LeadTab {
  return LEAD_TABS.some((tab) => tab.key === value);
}

export function LeadTabNav({
  id,
  current,
  counts,
}: {
  id: string;
  current: LeadTab;
  /** Optional per-tab count, so an empty tab says so before it opens. */
  counts?: Partial<Record<LeadTab, number>>;
}) {
  return (
    <nav aria-label="Lead sections" className="border-b border-line">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {LEAD_TABS.map((tab) => {
          const active = tab.key === current;
          const count = counts?.[tab.key];
          return (
            <li key={tab.key}>
              <Link
                href={`/admin/leads/${id}?tab=${tab.key}` as never}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm whitespace-nowrap transition-colors duration-200 ${
                  active
                    ? "border-oxblood text-ink"
                    : "border-transparent text-structure hover:text-ink"
                }`}
              >
                {tab.label}
                {typeof count === "number" && count > 0 && (
                  <span className="data-inline text-caption text-structure">
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

/**
 * Anything the seller must never see.
 *
 * Score, channel, eligibility and every decision-engine projection
 * are internal (CLAUDE.md section 11). They are correct on this page
 * and nowhere else, and the border says so rather than relying on
 * everyone remembering. test/internal-only.test.ts proves none of the
 * terms inside reach a seller-facing route.
 */
export function InternalOnly({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-dashed border-oxblood/50 bg-paper p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        <span className="rounded border border-oxblood px-2 py-0.5 text-caption text-oxblood">
          Internal only
        </span>
      </div>
      <p className="mt-1 text-caption text-structure">
        Never shown to the seller and never sent in any email to them.
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
