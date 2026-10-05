"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { PROMISES } from "@/config/site";

/**
 * Step 4 of four — you.
 *
 * The lead row is created when this step submits, because CLAUDE.md
 * section 9 requires a confirmed registration AND contact details before
 * a lead exists. Everything from steps 2 and 3 is held client-side until
 * now and written in the same call.
 *
 * Marketing consent is unticked, worded separately from the enquiry, and
 * never a condition of getting an offer (section 16).
 */

export interface ContactDetails {
  name: string;
  phone: string;
  email: string;
  postcode: string;
  contactWindow: string;
  marketingConsent: boolean;
}

type FieldErrors = Record<string, string[] | undefined>;

export function StepYou({
  value,
  onChange,
  onBack,
  onSubmit,
  pending,
  errors,
  formError,
}: {
  value: ContactDetails;
  onChange: (next: ContactDetails) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
  errors: FieldErrors;
  formError?: string;
}) {
  const set = <K extends keyof ContactDetails>(
    key: K,
    next: ContactDetails[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <form
      className="step-in"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <h2 className="font-display text-display-3">
        Where do we send the offer?
      </h2>
      <p className="mt-3 max-w-prose text-structure">
        A person calls you within {PROMISES.offerWithinHours} hours with a
        firm number. No automated valuation, and nothing else sent to you.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <TextField
          label="Your name"
          name="name"
          autoComplete="name"
          defaultValue={value.name}
          error={errors.name?.[0]}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            mono
            defaultValue={value.phone}
            error={errors.phone?.[0]}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            defaultValue={value.email}
            error={errors.email?.[0]}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Postcode"
            name="postcode"
            autoComplete="postal-code"
            defaultValue={value.postcode}
            hint="So we can plan collection."
            error={errors.postcode?.[0]}
          />
          <TextField
            label="Best time to call"
            name="contactWindow"
            optional
            hint="Mornings, after six, weekends."
            defaultValue={value.contactWindow}
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-structure">
          <input
            type="checkbox"
            name="marketingConsent"
            checked={value.marketingConsent}
            onChange={(event) => set("marketingConsent", event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-oxblood"
          />
          <span>
            Send me occasional updates on the market for cars like mine. This
            is separate from your enquiry — we contact you about your offer
            either way.
          </span>
        </label>
      </div>

      {formError && (
        <p role="alert" className="mt-6 font-medium text-oxblood">
          {formError}
        </p>
      )}

      <div className="mt-12 flex items-center gap-6">
        <Button disabled={pending}>
          {pending ? "Sending your request…" : "Get my offer"}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="link-draw text-sm text-structure"
        >
          Back
        </button>
      </div>
      <p className="mt-3 text-caption text-structure">
        A firm offer within {PROMISES.offerWithinHours} hours. No obligation,
        and the number doesn&apos;t change.
      </p>
    </form>
  );
}
