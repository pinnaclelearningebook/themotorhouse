"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlateInput } from "@/components/ui/PlateInput";
import { VehicleCard } from "@/components/forms/VehicleCard";
import { isPlausibleReg, normaliseReg } from "@/lib/reg";
import type { MotTest, VehicleIdentity, VehicleLookup } from "@/lib/types";

/**
 * Step 1 — identify. The lowest possible first ask: one field.
 *
 * On confirm the parent moves to the details step with whatever the
 * lookup found. "Not my car", a registration we cannot find, and a
 * lookup that is unavailable all land in the same place — manual entry —
 * because from the seller's point of view they are the same thing.
 */

export interface IdentifyResult {
  reg: string;
  vehicle: VehicleIdentity | null;
  mot: MotTest[];
}

type State =
  | { name: "idle" }
  | { name: "looking" }
  | { name: "found"; vehicle: VehicleIdentity; mot: MotTest[] }
  | { name: "unavailable"; reason: string };

export function IdentifyStep({
  initialReg,
  onIdentified,
}: {
  initialReg?: string;
  onIdentified: (result: IdentifyResult) => void;
}) {
  const [state, setState] = useState<State>({ name: "idle" });
  // Captured on submit rather than via onChange, so PlateInput stays a
  // server component. It renders in the hero on every page and does not
  // need to ship JavaScript to do its job.
  const [reg, setReg] = useState(initialReg ?? "");
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const lookup = useCallback(async (candidate: string) => {
    const normalised = normaliseReg(candidate);
    setReg(normalised);
    if (!isPlausibleReg(normalised)) {
      setError("Enter your registration.");
      return;
    }
    setError(null);
    setState({ name: "looking" });

    try {
      const response = await fetch("/api/vehicle/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg: normalised }),
      });

      if (response.status === 429) {
        setState({
          name: "unavailable",
          reason: "Too many lookups just now. You can enter the details yourself.",
        });
        return;
      }
      if (!response.ok) {
        setState({
          name: "unavailable",
          reason: "We could not find that registration. Enter the details yourself.",
        });
        return;
      }

      const data = (await response.json()) as VehicleLookup;
      if (!data.vehicle) {
        setState({
          name: "unavailable",
          reason: "Vehicle lookup is not available. Enter the details yourself.",
        });
        return;
      }
      setState({ name: "found", vehicle: data.vehicle, mot: data.mot });
    } catch {
      setState({
        name: "unavailable",
        reason: "Vehicle lookup is not available. Enter the details yourself.",
      });
    }
  }, []);

  // Arriving from a plate submitted on another page: look it up without
  // making the seller type it twice.
  useEffect(() => {
    if (autoRan.current || !initialReg) return;
    autoRan.current = true;
    void lookup(initialReg);
  }, [initialReg, lookup]);

  if (state.name === "found") {
    return (
      <div className="step-in">
        <h2 className="font-display text-display-3">Is this your car?</h2>
        <p className="mt-3 max-w-prose text-structure">
          Straight from the DVLA record. Check it over before we go on.
        </p>
        <div className="mt-8">
          <VehicleCard vehicle={state.vehicle} mot={state.mot} />
        </div>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={() =>
              onIdentified({
                reg: state.vehicle.reg,
                vehicle: state.vehicle,
                mot: state.mot,
              })
            }
          >
            Yes, that&apos;s my car
          </Button>
          <button
            type="button"
            onClick={() =>
              onIdentified({ reg: state.vehicle.reg, vehicle: null, mot: [] })
            }
            className="link-draw text-sm text-structure"
          >
            That&apos;s not my car
          </button>
        </div>
      </div>
    );
  }

  if (state.name === "unavailable") {
    return (
      <div className="step-in">
        <h2 className="font-display text-display-3">Tell us about the car</h2>
        <p className="mt-3 max-w-prose text-structure">{state.reason}</p>
        <div className="mt-8">
          <Button
            type="button"
            onClick={() =>
              onIdentified({ reg: normaliseReg(reg), vehicle: null, mot: [] })
            }
          >
            Enter the details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="step-in"
      onSubmit={(event) => {
        event.preventDefault();
        const entered = new FormData(event.currentTarget).get("reg");
        void lookup(typeof entered === "string" ? entered : "");
      }}
    >
      <h2 className="font-display text-display-3">
        Start with your registration
      </h2>
      <p className="mt-3 max-w-prose text-structure">
        We will pull up your car from the DVLA record, so you are not
        typing out what we can already look up.
      </p>
      <div className="mt-8">
        <PlateInput defaultValue={initialReg} />
        {error && (
          <p className="mt-1.5 text-caption font-medium text-oxblood">{error}</p>
        )}
      </div>
      <div className="mt-8">
        <Button disabled={state.name === "looking"}>
          {state.name === "looking" ? "Looking up your car…" : "Find my car"}
        </Button>
      </div>
    </form>
  );
}
