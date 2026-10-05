"use client";

import { useActionState } from "react";
import { logComparable, type LogResult } from "./actions";

/**
 * One row of evidence at a time. Deliberately short: the faster this is
 * to fill in from a phone standing next to a car, the more of them exist.
 */

const FIELDS = [
  { name: "make", label: "Make", type: "text" },
  { name: "model", label: "Model", type: "text" },
  { name: "derivative", label: "Derivative", type: "text", wide: true },
  { name: "year", label: "Year", type: "number", mono: true },
  { name: "mileage", label: "Mileage", type: "number", mono: true },
  { name: "asking", label: "Asking £", type: "number", mono: true },
  { name: "sold", label: "Sold £", type: "number", mono: true },
  { name: "daysListed", label: "Days listed", type: "number", mono: true },
  { name: "source", label: "Source", type: "text" },
  { name: "url", label: "URL", type: "url", wide: true },
] as const;

export function ComparableForm() {
  const [state, action, pending] = useActionState<LogResult | null, FormData>(
    logComparable,
    null,
  );

  return (
    <form action={action} className="mt-6">
      <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <legend className="sr-only">Comparable details</legend>

        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="market" className="block text-caption text-structure">
            Market
          </label>
          <select
            id="market"
            name="market"
            required
            defaultValue="cyprus"
            className="mt-1 w-full rounded border border-line bg-paper px-2 py-1.5 text-sm"
          >
            <option value="cyprus">Cyprus</option>
            <option value="uk">UK</option>
          </select>
        </div>

        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={
              "wide" in field && field.wide ? "col-span-2" : "col-span-1"
            }
          >
            <label
              htmlFor={field.name}
              className="block text-caption text-structure"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              inputMode={field.type === "number" ? "numeric" : undefined}
              className={`mt-1 w-full rounded border border-line bg-paper px-2 py-1.5 text-sm ${
                "mono" in field && field.mono ? "data-inline font-mono" : ""
              }`}
            />
          </div>
        ))}

        <div className="col-span-2 sm:col-span-4">
          <label htmlFor="notes" className="block text-caption text-structure">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="mt-1 w-full rounded border border-line bg-paper px-2 py-1.5 text-sm"
          />
        </div>
      </fieldset>

      {state?.error && (
        <p role="alert" className="mt-4 text-sm font-medium text-oxblood">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-4 text-sm">
          Logged.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded bg-oxblood px-4 py-2 text-sm text-paper transition-colors hover:bg-oxblood-lt disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log comparable"}
      </button>
    </form>
  );
}
