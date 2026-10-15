import Link from "next/link";

/**
 * One number, what it is, and where to go about it.
 *
 * `value` is always a count we hold, never a projection. A dash is the
 * honest rendering of "none", not a zero dressed up — and `hint` says
 * what the number means rather than repeating the label.
 *
 * Every tone is a state an operator acts on differently: `urgent` is
 * oxblood because something is late, `quiet` is for a number that is
 * only context. Nothing here is decorative.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "default" | "urgent" | "quiet";
}) {
  const empty = value === 0 || value === "0";
  const body = (
    <>
      <p className="text-caption tracking-wide text-structure uppercase">
        {label}
      </p>
      <p
        className={`data-inline mt-2 text-[2rem] leading-none ${
          tone === "urgent" && !empty
            ? "text-oxblood"
            : empty
              ? "text-structure"
              : "text-ink"
        }`}
      >
        {empty ? "—" : value}
      </p>
      {hint && (
        <p className="mt-2 text-caption leading-snug text-structure">{hint}</p>
      )}
    </>
  );

  const base = `rounded border p-4 ${
    tone === "quiet" ? "border-line bg-paper-warm" : "border-line bg-paper"
  }`;

  return href ? (
    <Link
      href={href as never}
      className={`${base} block transition-colors duration-200 hover:border-oxblood`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
