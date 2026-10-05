"use client";

import { useActionState, useState } from "react";
import { z } from "zod";
import {
  submitStepOne,
  submitStepTwo,
  type StepOneState,
  type StepTwoState,
} from "@/app/actions/valuation";
import { stepOneSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { PlateInput } from "@/components/ui/PlateInput";
import { RadioGroup, TextArea, TextField, FieldError } from "./fields";
import { IdentifyStep, type IdentifyResult } from "./IdentifyStep";
import { PROMISES } from "@/config/site";
import type { VehicleIdentity } from "@/lib/types";
import { formatReg } from "@/lib/reg";

type FieldErrors = Record<string, string[] | undefined>;

const stepOneInitial: StepOneState = { status: "idle" };
const stepTwoInitial: StepTwoState = { status: "idle" };

export function ValuationForm({ initialReg }: { initialReg?: string }) {
  const [stepOne, stepOneAction, stepOnePending] = useActionState(
    submitStepOne,
    stepOneInitial,
  );
  // Set once the seller has confirmed the car, or declined the card and
  // chosen to type the details. Until then the identify step is shown.
  const [identified, setIdentified] = useState<IdentifyResult | null>(null);

  if (stepOne.status === "success") {
    return <StepTwo submissionId={stepOne.id} reg={stepOne.reg} />;
  }

  if (!identified) {
    return <IdentifyStep initialReg={initialReg} onIdentified={setIdentified} />;
  }

  // Mileage at the most recent MOT, used as a starting point the seller
  // edits. Absent on any vehicle without MOT history.
  const lastMileage =
    identified.mot.find((test) => test.odometer !== null)?.odometer ?? null;

  return (
    <StepOne
      initialReg={identified.reg}
      vehicle={identified.vehicle}
      initialMileage={lastMileage}
      action={stepOneAction}
      pending={stepOnePending}
      serverErrors={stepOne.status === "error" ? stepOne.fieldErrors : {}}
      formError={stepOne.status === "error" ? stepOne.formError : undefined}
    />
  );
}

function StepOne({
  initialReg,
  vehicle,
  initialMileage,
  action,
  pending,
  serverErrors,
  formError,
}: {
  initialReg?: string;
  vehicle?: VehicleIdentity | null;
  initialMileage?: number | null;
  action: (formData: FormData) => void;
  pending: boolean;
  serverErrors: FieldErrors;
  formError?: string;
}) {
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const errors = Object.values(clientErrors).some(Boolean)
    ? clientErrors
    : serverErrors;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = stepOneSchema.safeParse({
      reg: formData.get("reg"),
      mileage: formData.get("mileage"),
      postcode: formData.get("postcode"),
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      model: formData.get("model") ?? undefined,
      marketingConsent: formData.get("marketingConsent") === "on",
    });
    if (!parsed.success) {
      event.preventDefault();
      setClientErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setClientErrors({});
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      noValidate
      className="step-in flex flex-col gap-6"
    >
      {vehicle ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Your car</span>
          <p className="data-inline text-lg">
            {[formatReg(vehicle.reg), vehicle.make, vehicle.model]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <input type="hidden" name="reg" value={vehicle.reg} />
          <FieldError id="reg-error" error={errors.reg?.[0]} />
        </div>
      ) : (
        <div>
          <span className="mb-1.5 block text-sm font-medium">
            Your registration
          </span>
          <PlateInput defaultValue={initialReg} />
          <FieldError id="reg-error" error={errors.reg?.[0]} />
        </div>
      )}

      {vehicle && !vehicle.model && (
        <TextField
          label="Model"
          name="model"
          hint="The DVLA record does not carry the model, and this car has no MOT history to take it from yet."
          error={errors.model?.[0]}
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Mileage"
          name="mileage"
          inputMode="numeric"
          mono
          defaultValue={initialMileage ?? undefined}
          hint={
            initialMileage
              ? "Taken from the last MOT. Change it if it has moved on."
              : undefined
          }
          error={errors.mileage?.[0]}
        />
        <TextField
          label="Postcode"
          name="postcode"
          autoComplete="postal-code"
          error={errors.postcode?.[0]}
        />
      </div>

      <TextField
        label="Your name"
        name="name"
        autoComplete="name"
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
          error={errors.phone?.[0]}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.[0]}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-structure">
        <input
          type="checkbox"
          name="marketingConsent"
          className="mt-1 size-4 shrink-0 accent-oxblood"
        />
        <span>
          Send me occasional updates on the market for cars like mine. This is
          separate from your enquiry — we contact you about your offer either
          way.
        </span>
      </label>

      {formError && (
        <p role="alert" className="font-medium text-oxblood">
          {formError}
        </p>
      )}

      <div>
        <Button disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending your request…" : "Get my offer"}
        </Button>
        <p className="mt-3 text-caption text-structure">
          A firm offer within {PROMISES.offerWithinHours} hours. No obligation,
          and the number doesn&apos;t change.
        </p>
      </div>
    </form>
  );
}

function StepTwo({
  submissionId,
  reg,
}: {
  submissionId: string;
  reg: string;
}) {
  const [state, action, pending] = useActionState(
    submitStepTwo,
    stepTwoInitial,
  );
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <div className="step-in">
      <h2 className="font-display text-display-3">Offer request received</h2>
      <p className="mt-3 max-w-prose">
        You&apos;ll hear from a person within {PROMISES.offerWithinHours}{" "}
        hours about <span className="font-mono">{reg}</span>. A few more
        details help us firm up the number before we call — or leave it here
        and we&apos;ll cover it on the phone.
      </p>

      <form action={action} className="mt-10 flex flex-col gap-8">
        <input type="hidden" name="submissionId" value={submissionId} />

        <RadioGroup
          legend="Is there outstanding finance on the car?"
          name="financeOutstanding"
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unsure", label: "Not sure" },
          ]}
          error={errors.financeOutstanding?.[0]}
        />

        <RadioGroup
          legend="Service history"
          name="serviceHistory"
          options={[
            { value: "full", label: "Full" },
            { value: "partial", label: "Partial" },
            { value: "none", label: "None" },
          ]}
          error={errors.serviceHistory?.[0]}
        />

        <div className="max-w-40">
          <TextField
            label="Previous keepers"
            name="keepers"
            inputMode="numeric"
            mono
            optional
            error={errors.keepers?.[0]}
          />
        </div>

        <TextArea
          label="Damage or warning lights"
          name="conditionNotes"
          hint="Anything you'd want us to know before we make the offer. Honest detail now means the number on the phone is the number we pay."
          optional
          error={errors.conditionNotes?.[0]}
        />

        <RadioGroup
          legend="When are you looking to sell?"
          name="sellTimeline"
          options={[
            { value: "asap", label: "As soon as possible" },
            { value: "this-month", label: "This month" },
            { value: "next-few-months", label: "Next few months" },
            { value: "just-researching", label: "Just researching" },
          ]}
          error={errors.sellTimeline?.[0]}
        />

        {state.status === "error" && state.formError && (
          <p role="alert" className="font-medium text-oxblood">
            {state.formError}
          </p>
        )}

        <div>
          <Button disabled={pending} className="w-full sm:w-auto">
            {pending ? "Sending…" : "Send the details"}
          </Button>
        </div>
      </form>
    </div>
  );
}
