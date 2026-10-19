/**
 * Status, stage and channel, colour-coded so a row can be read without
 * being parsed.
 *
 * The palette is the site's and nothing else: ink, paper-warm, oxblood,
 * structure. No plate yellow anywhere in admin (CLAUDE.md section 5,
 * and test/constraints.test.ts enforces it). That rules out the usual
 * traffic-light scheme, so the ordering is carried by weight instead —
 * oxblood for the stages where money is committed, ink for work in
 * progress, hairline-on-paper for everything resolved or not started.
 */
const TONES = {
  neutral: "border-line bg-paper text-structure",
  active: "border-line-dark bg-ink text-paper",
  money: "border-oxblood bg-oxblood text-paper",
  warn: "border-oxblood bg-paper text-oxblood",
  quiet: "border-line bg-paper-warm text-structure",
} as const;

export type BadgeTone = keyof typeof TONES;

/** Lead status → how it should read at a glance. */
export const STATUS_TONE: Record<string, BadgeTone> = {
  new: "active",
  contacted: "active",
  offered: "warn",
  accepted: "money",
  collected: "money",
  listed: "money",
  shipped: "money",
  sold: "money",
  declined: "quiet",
  lost: "quiet",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  offered: "Offered",
  accepted: "Accepted",
  collected: "Collected",
  listed: "Listed",
  shipped: "Shipped",
  sold: "Sold",
  declined: "Declined",
  lost: "Lost",
};

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-2 py-0.5 text-caption whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
