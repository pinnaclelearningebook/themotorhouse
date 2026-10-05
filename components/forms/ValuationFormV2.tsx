"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitLead } from "@/app/actions/valuation";
import { IdentifyStep, type IdentifyResult } from "./IdentifyStep";
import { StepCar, type CarDetails } from "./StepCar";
import { StepSale, type SaleDetails } from "./StepSale";
import { StepYou, type ContactDetails } from "./StepYou";
import type { PendingPhoto } from "./PhotoUpload";

/**
 * The four-step form (CLAUDE.md section 9).
 *
 * Steps 2 and 3 are held here in component state. The lead row is
 * created when step 4 submits, because section 9 requires a confirmed
 * registration AND contact details before a lead exists. The cost of
 * that — a seller who abandons at step 3 leaves nothing — is recorded
 * in PENDING-INFO.md as a decision to revisit on real data.
 *
 * Photos upload to Blob during step 2 so the seller is not waiting at
 * the end; the photos rows are attached once the lead id exists.
 */

const EMPTY_CAR: CarDetails = {
  model: "",
  mileage: "",
  serviceHistory: "",
  keepers: "",
  condition: {},
  warningLights: "",
  knownFaults: "",
  modifications: "",
  photos: [],
};

const EMPTY_SALE: SaleDetails = {
  reasonForSale: "",
  timeline: "",
  financeOutstanding: "",
  settlementKnown: "",
  partExchangeInterest: "",
  fairPrice: "",
  othersApproached: "",
};

const EMPTY_CONTACT: ContactDetails = {
  name: "",
  phone: "",
  email: "",
  postcode: "",
  contactWindow: "",
  marketingConsent: false,
};

type Step = "identify" | "car" | "sale" | "you" | "done";

/** Reads the current DOM values for an uncontrolled step before leaving it. */
function readFields(names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[name="${name}"]`,
    );
    if (el) out[name] = el.value;
    const checked = document.querySelector<HTMLInputElement>(
      `input[name="${name}"]:checked`,
    );
    if (checked) out[name] = checked.value;
  }
  return out;
}

async function attachPhotos(leadId: string, photos: PendingPhoto[]) {
  if (photos.length === 0) return;
  try {
    await fetch("/api/photos/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        photos: photos.map((photo) => ({
          url: photo.url,
          shotType: photo.shotType,
          contentType: photo.contentType,
          bytes: photo.bytes,
          width: photo.width,
          height: photo.height,
          exifStripped: photo.exifStripped,
        })),
      }),
    });
  } catch {
    // The lead is already saved. A failed photo attach must not cost the
    // seller their submission; the auto-reply still invites photos by email.
  }
}

export function ValuationFormV2({
  initialReg,
  onComplete,
}: {
  initialReg?: string;
  onComplete?: (leadId: string) => void;
}) {
  const [step, setStep] = useState<Step>("identify");
  const [identified, setIdentified] = useState<IdentifyResult | null>(null);
  const [car, setCar] = useState<CarDetails>(EMPTY_CAR);
  const [sale, setSale] = useState<SaleDetails>(EMPTY_SALE);
  const [contact, setContact] = useState<ContactDetails>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const lastMileage =
    identified?.mot.find((test) => test.odometer !== null)?.odometer ?? null;

  function leaveCar() {
    const read = readFields([
      "model", "mileage", "keepers", "serviceHistory",
      "warningLights", "knownFaults", "modifications",
    ]);
    setCar({
      ...car,
      model: read.model ?? car.model,
      mileage: read.mileage ?? car.mileage,
      keepers: read.keepers ?? car.keepers,
      serviceHistory: read.serviceHistory ?? car.serviceHistory,
      warningLights: read.warningLights ?? car.warningLights,
      knownFaults: read.knownFaults ?? car.knownFaults,
      modifications: read.modifications ?? car.modifications,
    });
    setStep("sale");
  }

  function leaveSale() {
    const read = readFields([
      "timeline", "reasonForSale", "financeOutstanding", "settlementKnown",
      "partExchangeInterest", "fairPrice", "othersApproached",
    ]);
    const next = { ...sale, ...read } as SaleDetails;
    setSale(next);
    if (!next.timeline) {
      setErrors({ timeline: ["Tell us when you are looking to sell"] });
      return;
    }
    setErrors({});
    setStep("you");
  }

  function submit() {
    const read = readFields([
      "name", "phone", "email", "postcode", "contactWindow",
    ]);
    const next = { ...contact, ...read } as ContactDetails;
    setContact(next);

    const payload = {
      reg: identified?.reg ?? "",
      // Only sent when the lookup had no model and the seller typed one.
      model: car.model || undefined,
      mileage: car.mileage,
      serviceHistory: car.serviceHistory || null,
      keepers: car.keepers || null,
      condition: Object.keys(car.condition).length ? car.condition : null,
      warningLights: car.warningLights || null,
      knownFaults: car.knownFaults || null,
      modifications: car.modifications || null,
      reasonForSale: sale.reasonForSale || null,
      timeline: sale.timeline,
      financeOutstanding: sale.financeOutstanding || null,
      settlementKnown: sale.settlementKnown ? sale.settlementKnown === "yes" : null,
      partExchangeInterest: sale.partExchangeInterest
        ? sale.partExchangeInterest === "yes"
        : null,
      fairPrice: sale.fairPrice || null,
      othersApproached: sale.othersApproached || null,
      name: next.name,
      phone: next.phone,
      email: next.email,
      postcode: next.postcode,
      contactWindow: next.contactWindow || null,
      marketingConsent: next.marketingConsent,
    };

    startTransition(async () => {
      const result = await submitLead(payload);
      if (result.status === "error") {
        setErrors(result.fieldErrors);
        setFormError(result.formError);
        return;
      }
      if (result.status === "success") {
        // Photos attach after the lead exists. The seller is not made to
        // wait on it — the auto-reply still invites photos by email if
        // this fails.
        await attachPhotos(result.id, car.photos);
        setErrors({});
        setFormError(undefined);
        setStep("done");
        onComplete?.(result.id);
        router.push("/valuation/thank-you");
      }
    });
  }

  if (step === "identify" || !identified) {
    return (
      <IdentifyStep
        initialReg={initialReg}
        onIdentified={(result) => {
          setIdentified(result);
          setStep("car");
        }}
      />
    );
  }

  if (step === "car") {
    return (
      <StepCar
        vehicle={identified.vehicle}
        reg={identified.reg}
        initialMileage={lastMileage}
        value={car}
        onChange={setCar}
        onContinue={leaveCar}
      />
    );
  }

  if (step === "sale") {
    return (
      <StepSale
        value={sale}
        onBack={() => setStep("car")}
        onContinue={leaveSale}
        error={errors.timeline?.[0]}
      />
    );
  }

  if (step === "you") {
    return (
      <StepYou
        value={contact}
        onChange={setContact}
        onBack={() => setStep("sale")}
        onSubmit={submit}
        pending={pending}
        errors={errors}
        formError={formError}
      />
    );
  }

  // step === "done": the redirect to /valuation/thank-you is in flight.
  return (
    <p className="step-in text-structure" role="status">
      Sending your request…
    </p>
  );
}
