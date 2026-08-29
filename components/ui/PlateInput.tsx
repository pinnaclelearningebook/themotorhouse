/**
 * The signature element: a UK number plate as the registration input.
 * Plate yellow appears here and nowhere else on the site.
 *
 * Lettering uses the sanctioned fallback — letter-spaced condensed bold —
 * until the plate typeface decision in PENDING-INFO.md is made.
 * Pure CSS focus treatment (scale 1.02, soft oxblood glow), so this stays
 * a Server Component.
 */
export function PlateInput({
  id = "reg",
  defaultValue,
  autoFocus = false,
}: {
  id?: string;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="w-full max-w-105">
      <label htmlFor={id} className="sr-only">
        Vehicle registration
      </label>
      <div className="flex overflow-hidden rounded-lg border-2 border-ink transition-transform duration-250 ease-(--ease-standard) focus-within:scale-[1.02] focus-within:shadow-[0_0_0_4px_rgba(92,26,31,0.35)] motion-reduce:transition-none">
        <span
          aria-hidden="true"
          className="flex w-10 shrink-0 flex-col items-center justify-end bg-plate-flash pb-2 text-caption font-bold text-paper"
        >
          GB
        </span>
        <input
          id={id}
          name="reg"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={10}
          required
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="YOUR REG"
          className="h-16 w-full min-w-0 bg-plate px-4 text-center font-sans text-display-3 font-bold tracking-[0.12em] text-ink uppercase outline-none placeholder:text-ink/40 md:h-18"
        />
      </div>
    </div>
  );
}
