/**
 * A V5C, a service book and two keys on a desk.
 *
 * CLAUDE.md section 5: "the premium signal is paperwork done properly —
 * V5C, HPI certificate, stamped service book — not gloss." That line
 * had no picture behind it until this one.
 */
export function Paperwork({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 170"
      fill="none"
      role="img"
      aria-label="A line drawing of vehicle documents and a key"
      className={className}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke="currentColor" strokeWidth="2">
        {/* the back sheet */}
        <path d="M42 24 L150 24 C154 24 158 28 158 32 L158 128 C158 132 154 136 150 136 L42 136 C38 136 34 132 34 128 L34 32 C34 28 38 24 42 24 Z" />
        {/* ruled lines */}
        <path d="M52 56 L140 56" opacity="0.45" />
        <path d="M52 72 L140 72" opacity="0.45" />
        <path d="M52 88 L112 88" opacity="0.45" />
        {/* the front sheet, offset */}
        <path d="M66 50 L186 50 C190 50 194 54 194 58 L194 150 C194 154 190 158 186 158 L66 158 C62 158 58 154 58 150 L58 58 C58 54 62 50 66 50 Z" fill="var(--color-paper)" />
        <path d="M76 82 L176 82" opacity="0.45" />
        <path d="M76 98 L176 98" opacity="0.45" />
        <path d="M76 114 L146 114" opacity="0.45" />
      </g>
      {/* the stamp, and a key ring */}
      <g stroke="var(--color-oxblood)" strokeWidth="2.5">
        <path d="M76 62 L116 62" />
        <circle cx="166" cy="132" r="12" />
        <path d="M166 144 L166 152 M160 148 L166 148" />
      </g>
    </svg>
  );
}
