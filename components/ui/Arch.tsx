/**
 * The mark: a workshop doorway reduced to three strokes.
 *
 * Not a house. The arch is the opening a car is kept behind — the thing
 * "The Motor House" is actually naming — and at sixteen pixels it still
 * reads, which is the one thing a lettering-only mark cannot do.
 *
 * `currentColor` for the arch itself so it inherits ink on paper and
 * paper on ink, with the threshold in oxblood. The two inner strokes are
 * the door's division; they drop below 24px, where they would close up
 * into a smudge.
 */
export function Arch({
  size = 28,
  className,
  threshold = "var(--color-oxblood)",
}: {
  size?: number;
  className?: string;
  /** The line across the opening. Oxblood on both grounds. */
  threshold?: string;
}) {
  const detailed = size >= 24;
  const stroke = size >= 40 ? 2.5 : size >= 24 ? 3 : 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M8 40 V22 A16 16 0 0 1 40 22 V40"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="square"
      />
      <line
        x1="8"
        y1="40"
        x2="40"
        y2="40"
        stroke={threshold}
        strokeWidth={stroke}
        strokeLinecap="square"
      />
      {detailed && (
        <>
          <line x1="17" y1="40" x2="17" y2="28" stroke="currentColor" strokeWidth="2" opacity="0.38" />
          <line x1="31" y1="40" x2="31" y2="28" stroke="currentColor" strokeWidth="2" opacity="0.38" />
        </>
      )}
    </svg>
  );
}
