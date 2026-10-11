/**
 * A car transporter, loaded. Collection, in one line.
 */
export function Transporter({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 180"
      fill="none"
      role="img"
      aria-label="A line drawing of a car transporter with a car on the deck"
      className={className}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke="currentColor" strokeWidth="2">
        {/* cab */}
        <path d="M20 132 L20 86 C20 80 24 76 30 76 L58 76 L76 52 L104 52 L104 132" />
        <path d="M62 76 L76 58 L96 58 L96 76 Z" />
        {/* deck and ramp */}
        <path d="M104 118 L392 118" strokeWidth="2.5" />
        <path d="M392 118 L392 92" />
        <path d="M118 118 L118 132 M378 118 L378 132" />
        {/* the car on the deck */}
        <g strokeWidth="1.75" opacity="0.75">
          <path d="M150 104 L150 94 C150 90 153 88 157 87 L186 80 L206 66 C209 63 213 62 217 62 L272 62 C277 62 281 64 284 67 L300 82 L326 87 C331 88 334 91 334 95 L334 104" />
          <path d="M150 104 L184 104 M216 104 L272 104 M304 104 L334 104" />
          <circle cx="200" cy="104" r="15" />
          <circle cx="288" cy="104" r="15" />
        </g>
      </g>
      <g stroke="currentColor" strokeWidth="2">
        <circle cx="62" cy="134" r="22" />
        <circle cx="62" cy="134" r="9" />
        <circle cx="330" cy="134" r="22" />
        <circle cx="330" cy="134" r="9" />
        <circle cx="384" cy="134" r="22" />
        <circle cx="384" cy="134" r="9" />
      </g>
      <path d="M8 164 L412 164" stroke="var(--color-oxblood)" strokeWidth="2.5" />
    </svg>
  );
}
