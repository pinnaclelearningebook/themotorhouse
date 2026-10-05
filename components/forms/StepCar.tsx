"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConditionGrid } from "@/components/forms/ConditionGrid";
import { PhotoUpload, type PendingPhoto } from "@/components/forms/PhotoUpload";
import { TextField, TextArea, RadioGroup } from "@/components/forms/fields";
import type { ConditionState } from "@/config/condition";
import type { VehicleIdentity } from "@/lib/types";
import { formatReg } from "@/lib/reg";
import { titleCaseVehicle } from "@/lib/format";

/**
 * Step 2 of four — the car.
 *
 * Deliberately not a questionnaire. The seller has just confirmed their
 * car on the previous screen, so this opens by naming it and then asks
 * the things a buyer would ask while walking round it. Nothing here is
 * required: a seller who answers none of it still reaches step 4.
 */

export interface CarDetails {
  /** Only collected when the lookup could not supply a model. */
  model: string;
  mileage: string;
  serviceHistory: string;
  keepers: string;
  condition: ConditionState;
  warningLights: string;
  knownFaults: string;
  modifications: string;
  photos: PendingPhoto[];
}

export function StepCar({
  vehicle,
  reg,
  initialMileage,
  value,
  onChange,
  onContinue,
}: {
  vehicle: VehicleIdentity | null;
  reg: string;
  initialMileage: number | null;
  value: CarDetails;
  onChange: (next: CarDetails) => void;
  onContinue: () => void;
}) {
  const [showPhotos, setShowPhotos] = useState(false);
  const set = <K extends keyof CarDetails>(key: K, next: CarDetails[K]) =>
    onChange({ ...value, [key]: next });

  const name = [vehicle?.make, vehicle?.model]
    .filter(Boolean)
    .map((part) => titleCaseVehicle(part as string))
    .join(" ");

  return (
    <div className="step-in">
      <h2 className="font-display text-display-3">
        {name ? `About your ${name}` : "About the car"}
      </h2>
      <p className="mt-3 max-w-prose text-structure">
        <span className="data-inline">{formatReg(reg)}</span>. Answer what you
        can — anything you skip we will simply ask on the phone.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {vehicle && !vehicle.model && (
          <TextField
            label="Model"
            name="model"
            defaultValue={value.model}
            hint="The DVLA record does not carry the model, and this car has no MOT history to take it from yet."
          />
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Mileage"
            name="mileage"
            inputMode="numeric"
            mono
            defaultValue={value.mileage || (initialMileage ?? undefined)}
            hint={
              initialMileage
                ? "From the last MOT. Change it if it has moved on."
                : undefined
            }
          />
          <TextField
            label="Previous keepers"
            name="keepers"
            inputMode="numeric"
            mono
            optional
            defaultValue={value.keepers}
          />
        </div>

        <RadioGroup
          legend="Service history"
          name="serviceHistory"
          options={[
            { value: "full", label: "Full" },
            { value: "partial", label: "Partial" },
            { value: "none", label: "None" },
          ]}
        />
        <p className="-mt-6 text-caption text-structure">
          Independent garages count. So do digital records held by the
          manufacturer, even if the book is empty.
        </p>

        <div>
          <h3 className="font-display text-2xl">How is it, honestly?</h3>
          <p className="mt-2 max-w-prose text-caption text-structure">
            An honest answer here is worth more to you than a flattering one.
            Wear that is described up front gets priced in. Wear we find on
            your driveway is the reason other buyers change their number.
          </p>
          <div className="mt-6">
            <ConditionGrid
              value={value.condition}
              onChange={(next) => set("condition", next)}
            />
          </div>
        </div>

        <TextField
          label="Warning lights"
          name="warningLights"
          optional
          hint="Anything showing on the dash, including one you have got used to."
          defaultValue={value.warningLights}
        />

        <TextArea
          label="Anything else we should know"
          name="knownFaults"
          optional
          hint="Known faults, work that is due, a noise it makes when cold."
        />

        <TextField
          label="Modifications"
          name="modifications"
          optional
          hint="Wheels, exhaust, tints, remap. Tell us if you still have the original parts."
          defaultValue={value.modifications}
        />

        <div>
          <h3 className="font-display text-2xl">Photos</h3>
          {showPhotos ? (
            <div className="mt-4">
              <PhotoUpload
                photos={value.photos}
                onChange={(next) => set("photos", next)}
              />
            </div>
          ) : (
            <div className="mt-2">
              <p className="max-w-prose text-caption text-structure">
                Optional, and the single thing most likely to make our offer
                firm first time. Takes about two minutes with a phone.
              </p>
              <button
                type="button"
                onClick={() => setShowPhotos(true)}
                className="mt-4 rounded border border-line px-5 py-2.5 text-sm transition-colors duration-200 hover:border-oxblood"
              >
                Add photos
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <Button type="button" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
