"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { type ContactMethod } from "@/lib/validation";
import { PROMISES } from "@/config/site";

/**
 * Step 4 of four — how to reach you.
 *
 * Every contact detail arrives here now (owner's decision, 15 October
 * 2026). The phone number used to be asked for at the end of step 1,
 * which made the first step two questions when its whole argument is
 * that it is one.
 *
 * **The phone number is required whichever method they choose.** The
 * published promise is that a person rings with the offer; a lead with
 * no number is a lead we cannot keep that promise on. The preference
 * decides which channel we open with, not whether we can call — and
 * the hint under the field says so, because a seller who picks
 * WhatsApp and is then asked for a phone number deserves to know why.
 *
 * Email is required only when they ask to be emailed. Otherwise it is
 * for a copy of the enquiry, which is a convenience and not something
 * to withhold an offer over.
 *
 * Marketing consent is unticked, worded separately from the enquiry,
 * and never a condition of getting an offer (section 16).
 */

export interface ContactDetails {
  name: string;
  preferredContactMethod: ContactMethod | "";
  phone: string;
  email: string;
  postcode: string;
  contactWindow: string;
  marketingConsent: boolean;
}

const METHOD_OPTIONS: Array<{ value: ContactMethod; label: string }> = [
  { value: "call", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "Text message" },
  { value: "email", label: "Email" },
];

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

  const wantsEmail = value.preferredContactMethod === "email";

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
        How would you like us to contact you?
      </h2>
      <p className="mt-3 max-w-prose text-structure">
        A person gets back to you within {PROMISES.offerWithinHours} hours with
        a firm number. No automated valuation, and nothing else sent to you.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {/*
         * Controlled, unlike the other fields on this step. The email
         * field's label and hint change with it, so it cannot wait to
         * be read out of the DOM on submit like the rest.
         */}
        <fieldset
          aria-describedby={
            errors.preferredContactMethod ? "method-error" : undefined
          }
        >
          <legend className="mb-2 block text-sm font-medium">
            Preferred method
          </legend>
          <div className="flex flex-wrap gap-2">
            {METHOD_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="min-h-11 cursor-pointer rounded border border-line px-4 py-2.5 text-sm transition-colors duration-200 has-checked:border-oxblood has-checked:bg-oxblood has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-oxblood"
              >
                <input
                  type="radio"
                  name="preferredContactMethod"
                  value={option.value}
                  checked={value.preferredContactMethod === option.value}
                  onChange={() =>
                    set("preferredContactMethod", option.value)
                  }
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.preferredContactMethod?.[0] && (
            <p id="method-error" role="alert" className="mt-2 text-sm text-oxblood">
              {errors.preferredContactMethod[0]}
            </p>
          )}
        </fieldset>

        <TextField
          label="Your name"
          name="name"
          autoComplete="name"
          defaultValue={value.name}
          error={errors.name?.[0]}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Phone number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            mono
            defaultValue={value.phone}
            hint="So we can reach you with your firm offer."
            error={errors.phone?.[0]}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            optional={!wantsEmail}
            defaultValue={value.email}
            hint={
              wantsEmail
                ? "Where we will send your offer."
                : "For a copy of your enquiry."
            }
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
            label="Best time to contact you"
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
