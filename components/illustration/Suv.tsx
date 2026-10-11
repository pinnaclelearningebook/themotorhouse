/**
 * A premium SUV in profile, drawn rather than photographed.
 *
 * Deliberately generic: a long bonnet, an upright glasshouse, square
 * arches and a high sill — the shape of the segment without the grille,
 * lights or badge that would make it somebody's model. Drawing it is
 * the only way to show a car at all while the honest answer to
 * photography is "we have none of our own yet" (CLAUDE.md section 5).
 *
 * Strokes are currentColor so it inherits ink on paper and paper on
 * ink; the ground line is oxblood, the one accent.
 */
export function Suv({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 190"
      fill="none"
      role="img"
      aria-label="A line drawing of a large estate car in profile"
      className={className}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke="currentColor" strokeWidth="2">
        {/* sill, arches and body */}
        <path d="M24 146 L24 118 C24 108 30 102 42 99 L96 86 L138 56 C144 51 152 48 161 48 L286 48 C296 48 305 52 311 59 L344 92 L380 100 C392 103 398 110 398 120 L398 146" />
        <path d="M24 146 L88 146" />
        <path d="M148 146 L274 146" />
        <path d="M334 146 L398 146" />
        {/* glasshouse */}
        <path d="M152 84 L178 60 C181 57 185 56 189 56 L206 56 L206 84 Z" />
        <path d="M218 56 L270 56 L270 84 L218 84 Z" />
        <path d="M282 56 L292 56 C296 56 299 57 302 60 L324 84 L282 84 Z" />
        {/* roof rail and shoulder */}
        <path d="M168 48 L296 48" strokeWidth="2.5" />
        <path d="M60 110 L108 104" />
        {/* door line */}
        <path d="M212 90 L212 136" strokeWidth="1.5" opacity="0.5" />
      </g>
      {/* wheels */}
      <g stroke="currentColor" strokeWidth="2">
        <circle cx="118" cy="146" r="30" />
        <circle cx="118" cy="146" r="13" />
        <circle cx="304" cy="146" r="30" />
        <circle cx="304" cy="146" r="13" />
      </g>
      {/* the ground */}
      <path d="M8 178 L412 178" stroke="var(--color-oxblood)" strokeWidth="2.5" />
    </svg>
  );
}
