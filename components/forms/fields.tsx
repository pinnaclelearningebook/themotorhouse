/**
 * Presentational field primitives for the valuation form.
 * Data-role inputs (mileage, phone) render in mono per the type system.
 */

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1.5 text-caption font-medium text-oxblood">
      {error}
    </p>
  );
}

export function TextField({
  label,
  name,
  error,
  type = "text",
  inputMode,
  autoComplete,
  mono = false,
  optional = false,
}: {
  label: string;
  name: string;
  error?: string;
  type?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  autoComplete?: string;
  mono?: boolean;
  optional?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-2 font-normal text-structure">Optional</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded border border-line bg-paper px-4 py-3 transition-colors duration-200 focus:border-oxblood ${mono ? "font-mono" : ""} ${error ? "border-oxblood" : ""}`}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

export function RadioGroup({
  legend,
  name,
  options,
  error,
}: {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 block text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded border border-line px-4 py-2.5 text-sm transition-colors duration-200 has-checked:border-oxblood has-checked:bg-oxblood has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-oxblood"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={errorId} error={error} />
    </fieldset>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  optional = false,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-2 font-normal text-structure">Optional</span>
        )}
      </label>
      {hint && <p className="mb-2 text-caption text-structure">{hint}</p>}
      <textarea
        id={name}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded border border-line bg-paper px-4 py-3 transition-colors duration-200 focus:border-oxblood ${error ? "border-oxblood" : ""}`}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}
