import { EmptyState } from "@/components/admin/ui/EmptyState";
import type { LucideIcon } from "lucide-react";

/**
 * A bar chart, in CSS, from counts we hold.
 *
 * No charting library: this is one series of small integers and a
 * 40KB dependency to draw it would cost more than it shows. It is a
 * description list, so a screen reader gets the numbers rather than
 * a shrug — the bars are presentational and the values are text.
 *
 * **It renders nothing when every value is zero.** A chart of
 * nothing still reads as a measurement, and an axis with flat bars
 * along it suggests we measured and found zero rather than that we
 * have not started. The empty state says which.
 */
export function BarChart({
  data,
  emptyTitle,
  emptyBody,
  emptyIcon,
  format = (value) => String(value),
}: {
  data: Array<{ label: string; value: number }>;
  emptyTitle: string;
  emptyBody: string;
  emptyIcon?: LucideIcon;
  format?: (value: number) => string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (max === 0) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle}>
        {emptyBody}
      </EmptyState>
    );
  }

  return (
    <dl className="flex flex-col gap-2">
      {data.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <dt className="w-28 shrink-0 truncate text-caption text-structure">
            {row.label}
          </dt>
          <dd className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className="h-4 rounded-xs bg-oxblood"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
            <span className="data-inline shrink-0 text-caption text-ink">
              {format(row.value)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The form funnel, as ordered steps with the drop between them.
 *
 * Separate from BarChart because the interesting number is not the
 * height of each bar but what fell out between one and the next, and
 * a reader should not have to subtract.
 */
export function FunnelChart({
  steps,
  note,
}: {
  steps: Array<{ label: string; value: number }>;
  note: string;
}) {
  const first = steps[0]?.value ?? 0;
  if (first === 0) {
    return (
      <EmptyState title="No submissions yet">
        The funnel fills in as sellers confirm a car. {note}
      </EmptyState>
    );
  }
  return (
    <>
      <dl className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const previous = index === 0 ? null : steps[index - 1].value;
          const dropped = previous === null ? 0 : previous - step.value;
          return (
            <div key={step.label} className="flex items-center gap-3">
              <dt className="w-32 shrink-0 truncate text-caption text-structure">
                {step.label}
              </dt>
              <dd className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-4 rounded-xs bg-ink"
                  style={{ width: `${Math.max(2, (step.value / first) * 100)}%` }}
                />
                <span className="data-inline shrink-0 text-caption text-ink">
                  {step.value}
                </span>
                {dropped > 0 && (
                  <span className="data-inline shrink-0 text-caption text-oxblood">
                    −{dropped}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-caption leading-snug text-structure">{note}</p>
    </>
  );
}
