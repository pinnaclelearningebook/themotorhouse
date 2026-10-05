"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { formatReg } from "@/lib/reg";
import { titleCaseVehicle } from "@/lib/format";
import type { VehicleIdentity } from "@/lib/types";

/**
 * The end of step 1, immediately after the car is confirmed.
 *
 * One field. This is the point at which the lead exists (CLAUDE.md
 * section 9): a registration and a number someone can ring is already
 * worth having, and asking for it here means a seller who abandons at
 * step 2 or 3 still leaves something actionable rather than nothing.
 *
 * Deliberately not dressed up as a gate. One line says what it is for
 * and that nothing else is being asked yet.
 */
export function PhoneStep({
  reg,
  vehicle,
  value,
  onContinue,
  pending,
  error,
  formError,
}: {
  reg: string;
  vehicle: VehicleIdentity | null;
  value: string;
  /**
   * Receives the typed value directly. Setting state then calling a
   * no-arg continue reads the previous value, because React state is
   * not applied synchronously.
   */
  onContinue: (phone: string) => void;
  pending: boolean;
  error?: string;
  formError?: string;
}) {
  const name = [vehicle?.make, vehicle?.model]
    .filter(Boolean)
    .map((part) => titleCaseVehicle(part as string))
    .join(" ");

  return (
    <form
      className="step-in"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const field = new FormData(event.currentTarget).get("phone");
        onContinue(typeof field === "string" ? field : "");
      }}
    >
      <h2 className="font-display text-display-3">
        {name ? `Your ${name}` : "Your car"}
      </h2>
      <p className="mt-3 max-w-prose text-structure">
        <span className="data-inline">{formatReg(reg)}</span>
      </p>

      <div className="mt-10 max-w-sm">
        <TextField
          label="Best number to reach you"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          mono
          defaultValue={value}
          hint="So a person can call you back. Nothing else yet."
          error={error}
        />
      </div>

      {formError && (
        <p role="alert" className="mt-6 font-medium text-oxblood">
          {formError}
        </p>
      )}

      <div className="mt-10">
        <Button disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
