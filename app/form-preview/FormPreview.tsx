"use client";

import { useState } from "react";
import { StepCar, type CarDetails } from "@/components/forms/StepCar";
import type { VehicleIdentity } from "@/lib/types";

const SAMPLE: VehicleIdentity = {
  reg: "LM70XYZ",
  make: "LAND ROVER",
  model: "DISCOVERY SPORT",
  derivative: null,
  colour: "BLACK",
  fuel: "DIESEL",
  engineCc: 1999,
  yearOfManufacture: 2020,
  firstRegistered: "2020-09-01",
  taxStatus: "Taxed",
  taxDue: "2026-09-01",
  motStatus: "Valid",
  motExpiry: "2026-08-14",
  co2: 160,
  euroStatus: "EURO 6",
  typeApproval: "M1",
  wheelplan: "2 AXLE RIGID BODY",
};

const EMPTY: CarDetails = {
  mileage: "",
  serviceHistory: "",
  keepers: "",
  condition: {},
  warningLights: "",
  knownFaults: "",
  modifications: "",
  photos: [],
};

export function FormPreview() {
  const [details, setDetails] = useState<CarDetails>(EMPTY);
  return (
    <StepCar
      vehicle={SAMPLE}
      reg={SAMPLE.reg}
      initialMileage={72500}
      value={details}
      onChange={setDetails}
      onContinue={() => {}}
    />
  );
}
