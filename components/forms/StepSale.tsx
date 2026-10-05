"use client";

import { Button } from "@/components/ui/Button";
import { RadioGroup, TextArea, TextField } from "@/components/forms/fields";

/**
 * Step 3 of four — the sale.
 *
 * The commercially important step, and the one that most has to avoid
 * feeling like qualification. Timeline is the field that decides whether
 * a lead is a call today or a date in the diary, so it is the only
 * required answer here — "just researching" is a follow-up date, never a
 * dead lead (CLAUDE.md section 9).
 *
 * `fairPrice` is stored for the operator's context and is never echoed
 * back to the seller as an offer, never shown on the site, and never an
 * input to the decision engine.
 */

export interface SaleDetails {
  reasonForSale: string;
  timeline: string;
  financeOutstanding: string;
  settlementKnown: string;
  partExchangeInterest: string;
  fairPrice: string;
  othersApproached: string;
}

export function StepSale({
  value,
  onBack,
  onContinue,
  error,
}: {
  /** Read on leave rather than per keystroke; see readFields in the parent. */
  value: SaleDetails;
  onBack: () => void;
  onContinue: () => void;
  error?: string;
}) {
  return (
    <div className="step-in">
      <h2 className="font-display text-display-3">About the sale</h2>
      <p className="mt-3 max-w-prose text-structure">
        This is the part that decides how we handle your car, so it is
        worth two minutes.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        <div>
          <RadioGroup
            legend="When are you looking to sell?"
            name="timeline"
            options={[
              { value: "asap", label: "As soon as possible" },
              { value: "this_month", label: "This month" },
              { value: "few_months", label: "Next few months" },
              { value: "researching", label: "Just researching" },
            ]}
            error={error}
          />
          <p className="mt-2 text-caption text-structure">
            Researching is a perfectly good answer. We will note it and
            leave you alone until it is useful to hear from us.
          </p>
        </div>

        <TextArea
          label="What is prompting the sale?"
          name="reasonForSale"
          optional
          hint="New car on order, outgrowing it, moving, no longer needed. It helps us judge what matters to you."
        />

        <div>
          <RadioGroup
            legend="Is there outstanding finance?"
            name="financeOutstanding"
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
              { value: "unsure", label: "Not sure" },
            ]}
          />
          {value.financeOutstanding === "yes" && (
            <div className="step-in mt-3">
              <RadioGroup
                legend="Do you know the settlement figure?"
                name="settlementKnown"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "Not yet" },
                ]}
              />
              <p className="mt-2 text-caption text-structure">
                If not, your lender has to give it to you on request. We
                settle it directly and pay you the balance.
              </p>
            </div>
          )}
        </div>

        <RadioGroup
          legend="Would you consider a part-exchange?"
          name="partExchangeInterest"
          options={[
            { value: "no", label: "No, selling outright" },
            { value: "yes", label: "Possibly" },
          ]}
        />

        <TextField
          label="What do you think is a fair price?"
          name="fairPrice"
          inputMode="numeric"
          mono
          optional
          hint="Only if you have a figure in mind. We will not quote it back at you, and it does not set our number — it just tells us whether we are in the same place."
        />

        <TextField
          label="Have you had other offers?"
          name="othersApproached"
          optional
          hint="Who, and what they said. We would rather know what we are being compared against."
        />
      </div>

      <div className="mt-12 flex items-center gap-6">
        <Button type="button" onClick={onContinue}>
          Continue
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="link-draw text-sm text-structure"
        >
          Back
        </button>
      </div>
    </div>
  );
}
