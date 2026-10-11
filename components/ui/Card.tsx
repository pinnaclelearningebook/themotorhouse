/**
 * A container with a border, a 4px radius and consistent padding.
 *
 * Everything that is a discrete piece of content on this site is one of
 * these: a promise, a model, a column of the comparison, a guide. The
 * border is a hairline rather than a shadow, because the design
 * direction is paperwork done properly and paperwork has rules on it,
 * not drop shadows (CLAUDE.md section 5).
 */
export function Card({
  children,
  className = "",
  tone = "paper",
  hover = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Which ground the card sits on, so its border has contrast. */
  tone?: "paper" | "warm" | "ink";
  /** A 2px lift and a border that warms on hover. For links only. */
  hover?: boolean;
  as?: "div" | "li" | "article";
}) {
  const tones = {
    paper: "bg-paper border-line",
    warm: "bg-paper-warm border-line",
    ink: "bg-ink-soft border-line-dark",
  };
  return (
    <Tag
      className={`rounded border p-6 md:p-8 ${tones[tone]} ${
        hover
          ? "transition-[transform,border-color] duration-200 ease-(--ease-standard) hover:-translate-y-0.5 hover:border-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
